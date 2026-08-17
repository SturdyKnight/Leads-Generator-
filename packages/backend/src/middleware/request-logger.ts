/**
 * One line per completed request. The SSE stream is skipped — it stays open for
 * the life of the page, so logging it on finish only records disconnections.
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path.endsWith('/events')) return next();

  const start = Date.now();

  res.on('finish', () => {
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`;

    // Failures are reported by the error handler with full context, so this
    // only needs to carry the successful traffic.
    if (res.statusCode < 400) logger.debug(line);
  });

  next();
}
