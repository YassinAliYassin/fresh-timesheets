import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api, { API_URL } from './api';

function createStorageMock(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('api client', () => {
  let store: Storage;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createStorageMock();
    vi.stubGlobal('localStorage', store);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('is configured with the Vite API URL (empty default)', () => {
    expect(API_URL).toBe('');
    expect(api.defaults.baseURL).toBe('');
  });

  it('GET sends no body and merges the token when present', async () => {
    store.setItem('token', 'abc123');
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const result = await api.get<{ ok: boolean }>('/events');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/events');
    expect(opts.method).toBeUndefined();
    expect(opts.body).toBeUndefined();
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(result).toEqual({ ok: true });
  });

  it('omits the Authorization header when no token is stored', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await api.get('/events');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('POST stringifies the data body and sets method', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));
    const payload = { client_name: 'Acme', venue: 'Hall' };
    await api.post('/events', payload);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify(payload));
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('POST sends an undefined body when no data is provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.post('/events');
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('PUT stringifies the data body and sets method', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));
    await api.put('/events/1', { venue: 'Updated' });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('PUT');
    expect(opts.body).toBe(JSON.stringify({ venue: 'Updated' }));
  });

  it('DELETE sets the method and no body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ deleted: true }));
    await api.delete('/events/1');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('DELETE');
    expect(opts.body).toBeUndefined();
  });

  it('merges caller-supplied headers over the defaults', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get('/events', { headers: { 'X-Trace': 'trace-1' } });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['X-Trace']).toBe('trace-1');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws with the server error message on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, false, 401));
    await expect(api.get('/me')).rejects.toThrow('Unauthorized');
  });

  it('falls back to a status message when the error body is missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    await expect(api.get('/me')).rejects.toThrow('Request failed: 500');
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('bad json')),
    } as Response);
    await expect(api.get('/me')).rejects.toThrow('Request failed: 502');
  });
});
