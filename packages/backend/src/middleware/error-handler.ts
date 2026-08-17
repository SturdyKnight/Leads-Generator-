/**
 * Terminal error handling.
 *
 * Two things matter here beyond formatting. Prisma's known error codes are
 * mapped to real HTTP statuses, so a duplicate no longer surfaces as a generic
 * 500. And once a response has begun streaming — the Excel exports do — the
 * only safe action is to destroy the connection, because setting headers after
 * they are sent crashes the process.
 */

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `No route matches ${req.method} ${req.originalUrl}` },
  });
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = translate(error);

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${status}`, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → ${status}: ${body.message}`);
  }

  if (res.headersSent) {
    res.destroy();
    return;
  }

  res.status(status).json({ success: false, error: body });
}

function translate(error: Error): { status: number; body: ErrorBody } {
  if (error instanceof ValidationError) {
    return {
      status: error.statusCode,
      body: { code: error.code, message: error.message, details: error.details },
    };
  }

  if (error instanceof AppError) {
    return { status: error.statusCode, body: { code: error.code, message: error.message } };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return translatePrisma(error);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      body: { code: 'DATABASE_UNAVAILABLE', message: 'Cannot reach the database.' },
    };
  }

  return {
    status: 500,
    body: {
      code: 'INTERNAL_ERROR',
      // Internal messages can leak schema details, so only expose them in dev.
      message: env.NODE_ENV === 'development' ? error.message : 'Something went wrong.',
    },
  };
}

function translatePrisma(error: Prisma.PrismaClientKnownRequestError): {
  status: number;
  body: ErrorBody;
} {
  switch (error.code) {
    case 'P2002': {
      const fields = (error.meta?.target as string[] | undefined)?.join(', ');
      return {
        status: 409,
        body: {
          code: 'DUPLICATE',
          message: fields ? `A record with this ${fields} already exists.` : 'This record already exists.',
        },
      };
    }
    case 'P2025':
      return { status: 404, body: { code: 'NOT_FOUND', message: 'That record no longer exists.' } };
    case 'P2003':
      return {
        status: 409,
        body: { code: 'IN_USE', message: 'Another record still depends on this one.' },
      };
    default:
      return {
        status: 500,
        body: { code: `DB_${error.code}`, message: 'The database rejected that operation.' },
      };
  }
}
