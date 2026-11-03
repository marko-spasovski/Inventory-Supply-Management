import { formatApiError } from '@/lib/http/errors';

describe('formatApiError', () => {
  it('extracts message from axios-style response body', () => {
    const err = { response: { data: { message: 'Not found', error: 'NotFound' } } };
    expect(formatApiError(err)).toBe('Not found');
  });

  it('falls back to error field when message is absent', () => {
    const err = { response: { data: { error: 'Unauthorized' } } };
    expect(formatApiError(err)).toBe('Unauthorized');
  });

  it('uses err.message for network errors', () => {
    const err = { message: 'Network Error' };
    expect(formatApiError(err)).toBe('Network Error');
  });

  it('returns string errors as-is', () => {
    expect(formatApiError('timeout')).toBe('timeout');
  });

  it('returns fallback for unknown error shapes', () => {
    expect(formatApiError(null)).toBe('Prišlo je do neznane napake.');
    expect(formatApiError(undefined)).toBe('Prišlo je do neznane napake.');
    expect(formatApiError(42)).toBe('Prišlo je do neznane napake.');
  });
});
