import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Gateway] Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message ?? 'An unexpected error occurred',
  });
}

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist' });
}
