import express from 'express';
import request from 'supertest';
import { of, throwError } from 'rxjs';
import { createNotificationRouter } from '../presentation/http/notification.router';
import { NotificationRepository } from '../domain/repository/notification.repository';
import { Notification } from '../domain/entites/notification.entity';

function makeRepo(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    findAll: jest.fn(() => of([])),
    findUnread: jest.fn(() => of([])),
    markAsRead: jest.fn(() => of(undefined)),
    markAllAsRead: jest.fn(() => of(undefined)),
    save: jest.fn(),
    ...overrides,
  } as NotificationRepository;
}

function makeApp(repo: NotificationRepository): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/notifications', createNotificationRouter(repo));
  return app;
}

const sampleNotif: Notification = {
  id: 'n-1',
  category: 'ORDER',
  severity: 'info',
  title: 'Hi',
  message: 'There',
  resourceId: null,
  read: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('NotificationRouter', () => {
  it('GET /notifications returns the list', async () => {
    const repo = makeRepo({ findAll: jest.fn(() => of([sampleNotif])) });

    const res = await request(makeApp(repo)).get('/notifications');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Hi');
  });

  it('GET /notifications/unread returns the unread list', async () => {
    const repo = makeRepo({ findUnread: jest.fn(() => of([sampleNotif])) });

    const res = await request(makeApp(repo)).get('/notifications/unread');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('PATCH /notifications/read-all returns 204', async () => {
    const repo = makeRepo();
    const res = await request(makeApp(repo)).patch('/notifications/read-all');
    expect(res.status).toBe(204);
    expect(repo.markAllAsRead).toHaveBeenCalled();
  });

  it('PATCH /notifications/:id/read passes the id and returns 204', async () => {
    const repo = makeRepo();
    const res = await request(makeApp(repo)).patch('/notifications/n-7/read');
    expect(res.status).toBe(204);
    expect(repo.markAsRead).toHaveBeenCalledWith('n-7');
  });

  it('returns 500 when repository throws', async () => {
    const repo = makeRepo({ findAll: jest.fn(() => throwError(() => new Error('boom'))) });
    // Silence the router's console.error so test output stays clean.
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(makeApp(repo)).get('/notifications');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('boom');
    errSpy.mockRestore();
  });
});
