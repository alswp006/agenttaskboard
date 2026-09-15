const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// KST(UTC+9) 기준 'YYYY-MM' — 사용 실적 월 경계 계산에 쓴다.
export function getKSTMonth(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  return `${year}-${month < 10 ? '0' + month : String(month)}`;
}

// KST 기준 '오늘' 자정 직후를 end로, 거기서 days일 전을 start로 하는 창.
export function getKSTDayWindow(date: Date, days: number): { start: Date; end: Date } {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const kstMidnightUtcMs = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const end = new Date(kstMidnightUtcMs + DAY_MS - KST_OFFSET_MS);
  const start = new Date(end.getTime() - days * DAY_MS);
  return { start, end };
}

// crypto.randomUUID가 없는 구형 WebView를 위한 UUID v4 폴백.
export function generateUUID(): string {
  const globalCrypto: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
    globalCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

function randomIdSuffix(): string {
  const uuid: string = generateUUID();
  let out = '';
  for (let i = 0; i < uuid.length; i++) {
    if (uuid[i] !== '-') out += uuid[i];
  }
  return out;
}

export function generateFlowId(): string {
  return `flow_${randomIdSuffix().slice(0, 8)}`;
}

export function generateRunId(): string {
  return `run_${randomIdSuffix().slice(0, 12)}`;
}
