/**
 * Zod validation middleware.
 *
 * Parsed output replaces the raw input, so handlers receive coerced values and
 * applied defaults rather than the strings Express hands over.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';

type Part = 'body' | 'query' | 'params';

function validate(schema: ZodSchema, part: Part) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      return next(new ValidationError(summarize(result.error), fieldErrors(result.error)));
    }

    req[part] = result.data;
    next();
  };
}

/** Lead with the first problem so the toast says something specific. */
function summarize(error: ZodError): string {
  const [first] = error.errors;
  if (!first) return 'That request was not valid.';

  const field = first.path.join('.');
  return field ? `${field}: ${first.message}` : first.message;
}

function fieldErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.errors) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }

  return details;
}

export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
