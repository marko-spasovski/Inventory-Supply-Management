import { forwardableHeaders } from '../data-fetcher';

describe('forwardableHeaders', () => {
  it('extracts only X-User-* headers (string values)', () => {
    const headers = {
      'x-user-id': 'u-1',
      'x-user-email': 'a@x.com',
      'x-user-role': 'MANAGER',
      'authorization': 'Bearer xyz',
      'content-type': 'application/json',
    };
    expect(forwardableHeaders({ headers })).toEqual({
      'x-user-id': 'u-1',
      'x-user-email': 'a@x.com',
      'x-user-role': 'MANAGER',
    });
  });

  it('ignores non-string header values (arrays)', () => {
    const headers: Record<string, string | string[] | undefined> = {
      'x-user-id': ['u-1', 'u-2'],
      'x-user-email': 'a@x.com',
    };
    expect(forwardableHeaders({ headers })).toEqual({
      'x-user-email': 'a@x.com',
    });
  });

  it('skips missing headers', () => {
    expect(forwardableHeaders({ headers: {} })).toEqual({});
  });
});
