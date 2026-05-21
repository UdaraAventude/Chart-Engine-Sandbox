import config from '../../config';

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path) {
  const base = (config.apiBaseUrl || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, parseJson = true } = options;

  const init = {
    method,
    headers: { ...headers },
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path), init);
  const contentType = response.headers.get('content-type') || '';

  let data = null;
  if (parseJson && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else if (!parseJson) {
    data = response;
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      data?.detail ||
      response.statusText ||
      `Request failed (${response.status})`;
    throw new ApiError(message, { status: response.status, body: data });
  }

  return data;
}

export function getHealth() {
  const base = (config.apiBaseUrl || '').replace(/\/api\/v1\/?$/, '');
  const healthPath = base ? `${base.replace(/\/$/, '')}/health` : '/health';
  return fetch(healthPath).then(async (res) => {
    if (!res.ok) throw new ApiError('Health check failed', { status: res.status });
    return res.json();
  });
}
