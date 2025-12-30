import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/auth.service';
import { AuthenticationError } from './error.middleware';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AuthenticationError('Invalid authorization format. Use: Bearer <token>');
    }

    const payload = authService.verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');

      if (scheme === 'Bearer' && token) {
        try {
          const payload = authService.verifyAccessToken(token);
          req.user = payload;
        } catch {
          // Token invalid, continue without auth
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
