/**
 * API client.
 *
 * The base URL comes from the environment so a built bundle can reach an API on
 * another origin — hardcoding '/api' only ever worked behind the dev proxy.
 * Errors are thrown as a real Error subclass carrying the server's own message,
 * so `toast.error(err)` shows the reason instead of a generic string.
 */

import type { ApiResponse } from '@bmatrix/shared';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type QueryParams = Record<string, string | number | boolean | string[] | undefined | null>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      value.forEach((entry) => url.searchParams.append(key, entry));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function request<T>(path: string, init: RequestInit & { params?: QueryParams } = {}): Promise<T> {
  const { params, ...options } = init;

  const response = await fetch(buildUrl(path, params), {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  // A proxy misconfiguration or an unmatched route returns HTML, so never parse
  // blindly — that surfaced as an opaque SyntaxError instead of the real status.
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  if (!payload) {
    throw new ApiError('The server returned an unexpected response.', response.status);
  }

  return payload as T;
}

const body = (data: unknown) => (data === undefined ? undefined : JSON.stringify(data));

export const api = {
  get: <T>(path: string, params?: QueryParams) =>
    request<ApiResponse<T>>(path, { method: 'GET', params }),

  post: <T>(path: string, data?: unknown) =>
    request<ApiResponse<T>>(path, { method: 'POST', body: body(data) }),

  put: <T>(path: string, data?: unknown) =>
    request<ApiResponse<T>>(path, { method: 'PUT', body: body(data) }),

  patch: <T>(path: string, data?: unknown) =>
    request<ApiResponse<T>>(path, { method: 'PATCH', body: body(data) }),

  delete: <T>(path: string) => request<ApiResponse<T>>(path, { method: 'DELETE' }),

  /** Download a file, surfacing server errors the same way as JSON requests. */
  download: async (path: string, params?: QueryParams): Promise<void> => {
    const response = await fetch(buildUrl(path, params));

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(payload?.error?.message ?? 'Export failed', response.status);
    }

    const disposition = response.headers.get('Content-Disposition');
    const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? 'export.xlsx';

    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
