// CP-2: 공통 에러 메시지 (정확한 문자열 — 화면은 이 문자열을 그대로 토스트에 띄운다)
export const ERROR_CODES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요',
  STORAGE_FULL: '저장 공간이 부족해요. 오래된 실행 로그를 삭제해주세요',
  QUOTA_EXCEEDED: '이번 달 실행 횟수를 모두 사용했어요',
  RATE_LIMITED: '잠시 후 다시 시도해주세요',
  DATA_CORRUPTED: '저장된 데이터를 불러오지 못했어요',
} as const;

export class FlowLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlowLimitError';
  }
}
