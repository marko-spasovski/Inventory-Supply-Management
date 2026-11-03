import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export type AppRole = 'MANAGER' | 'WORKER' | 'ADMIN' | 'DRIVER';

export interface JwtPayload {
  userId: string;
  sub:    string;   // email
  role:   AppRole;
  iat:    number;
  exp:    number;
}

// Attach decoded user to request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Mobile clients send JWT in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * Unlike the web gateway (which reads the AUTH_TOKEN HttpOnly cookie),
 * mobile apps manage the token themselves and send it explicitly.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    // auth-service signs with the raw UTF-8 bytes of the secret string
    // (Keys.hmacShaKeyFor(secret.getBytes()) — see JwtService.java line 24).
    // Use the same encoding here, or every verify will fail with "invalid signature".
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = payload;

    // Forward user context as headers so downstream services can trust them
    req.headers['x-user-id']    = payload.userId;
    req.headers['x-user-email'] = payload.sub;
    req.headers['x-user-role']  = payload.role;

    // Leave the Authorization header intact. Multiple routers are mounted at `/`
    // (productRouter, fleetRouter) and Express runs every router's middleware in
    // order, so deleting the header here would 401 any sibling router that runs
    // after this one finds no matching route. Downstream services ignore the
    // header and trust X-User-* instead, so leaving it costs nothing.

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Unauthorized', message: 'Token has expired' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: 'Token validation failed' });
    }
  }
}

/** Restrict a route to MANAGER (or ADMIN, which is a strict superset). */
export function requireManager(req: Request, res: Response, next: NextFunction): void {
  const role = req.user?.role;
  if (role !== 'MANAGER' && role !== 'ADMIN') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'This action requires MANAGER or ADMIN role',
    });
    return;
  }
  next();
}

/** Restrict a route to ADMIN only. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'This action requires ADMIN role',
    });
    return;
  }
  next();
}
