import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Rate limiter for authentication endpoints.
 * Uses windowMs and max values from config so they are configurable via
 * environment variables without code changes.
 */
export const authRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,  // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable the `X-RateLimit-*` headers

  handler: (_req, res) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    });
  },
});
