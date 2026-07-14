import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

interface AccessTokenPayload {
  sub: string;
  [key: string]: unknown;
}

/**
 * Auth guard middleware.
 * Verifies the `Authorization: Bearer <token>` header using the JWT access
 * secret, then attaches `req.userId` for downstream handlers.
 *
 * Throws UnauthorizedError for missing, malformed, or expired tokens.
 */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No bearer token provided.'));
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (typeof payload.sub !== 'string' || !payload.sub) {
      return next(new UnauthorizedError('Invalid token payload.'));
    }

    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Access token has expired.'));
    }
    return next(new UnauthorizedError('Invalid access token.'));
  }
}
