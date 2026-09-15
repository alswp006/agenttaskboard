/** 외부 API fetch 래퍼 — 타임아웃·X-Client-Id·에러 코드 매핑 (SPEC API Contract 절 대응) */
import { ERROR_CODES } from '@/lib/errors';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number | null;

  constructor(code: ApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const REQUEST_TIMEOUT_MS = 30000;

function getClientId(): string {
  return window.localStorage.getItem('atb:clientId') ?? '';
}

function statusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'INVALID_REQUEST';
    case 402:
      return 'QUOTA_EXCEEDED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'SERVER_ERROR';
  }
}

function statusToMessage(code: ApiErrorCode): string {
  switch (code) {
    case 'RATE_LIMITED':
      return ERROR_CODES.RATE_LIMITED;
    case 'QUOTA_EXCEEDED':
      return ERROR_CODES.QUOTA_EXCEEDED;
    case 'INVALID_REQUEST':
      return '요청 내용을 확인해주세요';
    case 'NOT_FOUND':
      return '요청한 항목을 찾을 수 없어요';
    case 'CONFLICT':
      return '이미 처리 중인 요청이에요';
    default:
      return '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요';
  }
}

async function request(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Id': getClientId(),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', ERROR_CODES.NETWORK_ERROR);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const code = statusToErrorCode(response.status);
    throw new ApiError(code, statusToMessage(code), response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError('INVALID_RESPONSE', '서버 응답을 처리하지 못했어요');
  }
}

export const apiClient = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  put: (path: string, body?: unknown) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
};
