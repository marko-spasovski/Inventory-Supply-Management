import { Router, Request, Response } from 'express';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import jwt from 'jsonwebtoken';
import { NotificationRepository } from '../../domain/repository/notification.repository';
import { config } from '../../infrastructure/config/config';

// Helper — keeps each route handler clean
function handleError(res: Response, label: string) {
  return catchError((err: Error) => {
    console.error(`[Router] ${label}:`, err.message);
    res.status(500).json({ error: err.message });
    return EMPTY;
  });
}

export function createNotificationRouter(repo: NotificationRepository): Router {
  const router = Router();

  // GET /notifications/ws-ticket — mints a short-lived JWT the browser can
  // pass as ?token=<jwt> when opening the WebSocket. The gateway has already
  // validated the AUTH_TOKEN cookie and forwarded the user identity headers,
  // so we just re-sign those claims with the WS secret.
  router.get('/ws-ticket', (req: Request, res: Response) => {
    const userId = req.header('X-User-Id');
    const email  = req.header('X-User-Email');
    const role   = req.header('X-User-Role');
    if (!userId || !email || !role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = jwt.sign(
      { sub: email, role, userId },
      config.ws.jwtSecret,
      { expiresIn: '5m' },
    );
    return res.json({ token });
  });

  // GET /notifications
  router.get('/', (_req: Request, res: Response) => {
    repo.findAll(50).pipe(
      handleError(res, 'findAll'),
    ).subscribe(notifications => res.json(notifications));
  });

  // GET /notifications/unread
  router.get('/unread', (_req: Request, res: Response) => {
    repo.findUnread().pipe(
      handleError(res, 'findUnread'),
    ).subscribe(notifications => res.json(notifications));
  });

  // PATCH /notifications/read-all  — must come before /:id/read
  router.patch('/read-all', (_req: Request, res: Response) => {
    repo.markAllAsRead().pipe(
      handleError(res, 'markAllAsRead'),
    ).subscribe(() => res.status(204).send());
  });

  // PATCH /notifications/:id/read
  router.patch('/:id/read', (req: Request, res: Response) => {
    repo.markAsRead(req.params['id']).pipe(
      handleError(res, 'markAsRead'),
    ).subscribe(() => res.status(204).send());
  });

  return router;
}