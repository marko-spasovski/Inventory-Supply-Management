import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { authMiddleware, requireManager, requireAdmin, JwtPayload } from '../middleware/auth.middleware';
import { config } from '../config';

function mockReqRes(overrides: Partial<Request> = {}): { req: Request; res: Response; next: jest.Mock } {
  const req = {
    headers: {},
    ...overrides,
  } as unknown as Request;

  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const res = { status, json } as unknown as Response;

  const next = jest.fn();
  return { req, res, next };
}

function sign(payload: Partial<JwtPayload>, opts: jwt.SignOptions = {}): string {
  const full = {
    userId: 'u-1',
    sub: 'user@x.com',
    role: 'WORKER' as const,
    ...payload,
  };
  return jwt.sign(full, config.jwt.secret, { expiresIn: '1h', ...opts });
}

describe('authMiddleware', () => {
  it('returns 401 when Authorization header missing', () => {
    const { req, res, next } = mockReqRes();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when scheme is not Bearer', () => {
    const { req, res, next } = mockReqRes({ headers: { authorization: 'Basic xyz' } });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for malformed token', () => {
    const { req, res, next } = mockReqRes({ headers: { authorization: 'Bearer not-a-jwt' } });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for expired token', () => {
    const expired = jwt.sign(
      { userId: 'u', sub: 'a@x.com', role: 'WORKER' },
      config.jwt.secret,
      { expiresIn: '-1s' },
    );
    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${expired}` } });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token has expired' }));
  });

  it('attaches user and forwards headers when token valid', () => {
    const token = sign({ userId: 'u-7', sub: 'm@x.com', role: 'MANAGER' });
    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${token}` } });

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.role).toBe('MANAGER');
    expect(req.user?.sub).toBe('m@x.com');
    expect(req.headers['x-user-id']).toBe('u-7');
    expect(req.headers['x-user-email']).toBe('m@x.com');
    expect(req.headers['x-user-role']).toBe('MANAGER');
  });

  it('preserves the Authorization header (does not delete)', () => {
    const token = sign({ role: 'WORKER' });
    const auth = `Bearer ${token}`;
    const { req, res, next } = mockReqRes({ headers: { authorization: auth } });

    authMiddleware(req, res, next);

    expect(req.headers['authorization']).toBe(auth);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireManager', () => {
  it('passes for MANAGER', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'MANAGER' } as JwtPayload;
    requireManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes for ADMIN', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'ADMIN' } as JwtPayload;
    requireManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 for WORKER', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'WORKER' } as JwtPayload;
    requireManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for DRIVER', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'DRIVER' } as JwtPayload;
    requireManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when user missing', () => {
    const { req, res, next } = mockReqRes();
    requireManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireAdmin', () => {
  it('passes only for ADMIN', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'ADMIN' } as JwtPayload;
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects MANAGER', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'MANAGER' } as JwtPayload;
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects WORKER', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'WORKER' } as JwtPayload;
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
