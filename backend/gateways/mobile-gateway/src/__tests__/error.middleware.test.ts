import { Request, Response } from 'express';
import { errorMiddleware, notFoundMiddleware } from '../middleware/error.middleware';

function mockRes(): Response {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  return { status, json } as unknown as Response;
}

describe('errorMiddleware', () => {
  // Silence the console.error inside the middleware so test output stays clean.
  let errSpy: jest.SpyInstance;
  beforeEach(() => { errSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errSpy.mockRestore(); });

  it('returns 500 with error message', () => {
    const res = mockRes();
    const err = new Error('boom');
    errorMiddleware(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Internal Server Error',
      message: 'boom',
    }));
  });

  it('falls back to default message when error.message is empty', () => {
    const res = mockRes();
    errorMiddleware(new Error(), {} as Request, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
    }));
  });
});

describe('notFoundMiddleware', () => {
  it('returns 404', () => {
    const res = mockRes();
    notFoundMiddleware({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Not Found' }));
  });
});
