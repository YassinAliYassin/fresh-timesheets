const API_URL = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('token');
}

type ApiData = Record<string, unknown> | unknown[] | object;

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const api = {
  get: <T = unknown>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T = unknown>(path: string, data?: ApiData, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T = unknown>(path: string, data?: ApiData, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T = unknown>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  get defaults() {
    return { baseURL: API_URL };
  },
};

export default api;
export { API_URL };
