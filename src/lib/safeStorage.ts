import { ERROR_CODES } from '@/lib/errors';

export { ERROR_CODES };

export interface SafeReadResult<T> {
  value: T;
  corrupted: boolean;
}

function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const anyErr = err as { name?: string; code?: number };
  return (
    anyErr.name === 'QuotaExceededError' ||
    anyErr.code === 22 ||
    anyErr.code === 1014
  );
}

// 손상된 JSON(파싱 실패)·빈 문자열은 throw 없이 기본값 + corrupted:true로 돌려준다.
// defaultValue를 any로 받아 T를 호출부 형태에 강제로 묶지 않는다 — 호출자가 필요하면
// readSafeStorage<Flow[]>(...)처럼 T를 명시하고, 아니면 결과값을 자유롭게 다룬다.
export function readSafeStorage<T = any>(key: string, defaultValue: any): SafeReadResult<T> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { value: defaultValue, corrupted: true };
  }

  if (raw === null) {
    return { value: defaultValue, corrupted: false };
  }
  if (raw === '') {
    return { value: defaultValue, corrupted: true };
  }

  try {
    const parsed = JSON.parse(raw) as T;
    return { value: parsed, corrupted: false };
  } catch {
    return { value: defaultValue, corrupted: true };
  }
}

// QuotaExceededError는 ERROR_CODES.STORAGE_FULL 메시지의 Error로 바꿔 던진다.
export function writeSafeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      throw new Error(ERROR_CODES.STORAGE_FULL);
    }
    throw err;
  }
}
