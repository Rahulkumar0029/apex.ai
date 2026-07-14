import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Central Express error-handler middleware.
 *
 * Must be registered LAST (after all routes and other middleware) so that
 * errors thrown or passed via `next(err)` anywhere in the stack reach it.
 *
 * - Known AppError subclasses → structured JSON with the error's own status code.
 * - Unknown errors          → log full stack, respond with 500 (never crash).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  // Unexpected / unhandled error — log the full trace so it appears in server logs
  console.error('[Unhandled Error]', err.stack ?? err.message);

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
