/**
 * Rate limiting.
 *
 * The general limit is deliberately generous: a single operator watching a live
 * campaign legitimately makes hundreds of requests a minute. The tight limit is
 * reserved for the routes that cost money — starting a discovery run spends
 * Google Places quota, and exports are expensive to generate.
 */

import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

const passThrough: RequestHandler = (_req, _res, next) => next();

function limiter(windowMs: number, max: number, message: string): RateLimitRequestHandler | RequestHandler {
  if (env.NODE_ENV !== 'production') return passThrough;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message } },
  });
}

export const generalLimiter = limiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX_REQUESTS,
  'Too many requests. Please slow down.',
);

export const expensiveLimiter = limiter(
  60_000,
  10,
  'Too many discovery or export requests. Try again in a minute.',
);
