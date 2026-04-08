/**
 * Global services placeholder — for future API integration.
 * Currently all operations are client-side only.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function hasContentTypeHeader(headers = {}) {
  return Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');
}

async function parseResponseBody(response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

function getErrorMessage(payload, status) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
  }

  return `HTTP ${status}`;
}

export async function apiRequest(endpoint, options = {}) {
  const nextHeaders = { ...(options.headers || {}) };
  const isFormDataBody = options.body instanceof FormData;
  const hasBody = typeof options.body !== 'undefined' && options.body !== null;

  if (hasBody && !isFormDataBody && !hasContentTypeHeader(nextHeaders)) {
    nextHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: nextHeaders,
  });
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload;
}
