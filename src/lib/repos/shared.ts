// Internal helpers shared by src/lib/repos/*. Not part of the packet contract.
import { writeSafeStorage } from '@/lib/safeStorage';

// Reads `key`, recovering from corrupted/invalid JSON by backing up the raw
// value under `${key}:backup` and resetting `key` to `defaultValue`.
export function readEntity<T>(
  key: string,
  defaultValue: T,
  isValid: (v: unknown) => boolean = () => true
): T {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return defaultValue;
  }
  if (raw === null) return defaultValue;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    backupAndReset(key, raw, defaultValue);
    return defaultValue;
  }

  if (!isValid(parsed)) {
    backupAndReset(key, raw, defaultValue);
    return defaultValue;
  }

  return parsed as T;
}

function backupAndReset<T>(key: string, raw: string, defaultValue: T): void {
  try {
    localStorage.setItem(`${key}:backup`, raw);
    localStorage.setItem(key, JSON.stringify(defaultValue));
  } catch {
    // Best-effort recovery — a secondary storage failure here shouldn't crash the caller.
  }
}

export function writeEntity<T>(key: string, value: T): void {
  writeSafeStorage(key, value);
}
