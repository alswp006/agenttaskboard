import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { generateFlow } from '@/api/endpoints';
import { clientRepo } from '@/lib/repos/clientRepo';
import { useAppToast } from '@/hooks/ToastProvider';
import { ERROR_CODES } from '@/lib/errors';
import type { RouteState } from '@/lib/types';

/**
 * /generate 제출 흐름: AI 고지 미확인 시 요청을 미뤄뒀다가(pendingPromptRef),
 * AiNoticeDialog의 onAck에서 그대로 이어 실행한다.
 */
export function useGenerateSubmit() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(false);
  const pendingPromptRef = useRef<string | null>(null);

  const runSubmit = useCallback(
    async (prompt: string) => {
      setLoading(true);
      try {
        const { draft, missingFields } = await generateFlow(prompt);
        navigate('/generate/result', {
          state: { prompt, draft, missingFields } as RouteState['/generate/result'],
        });
      } catch (err) {
        let message: string = ERROR_CODES.NETWORK_ERROR;
        if (err instanceof ApiError) {
          if (err.code === 'TIMEOUT') {
            message = 'AI 응답이 지연되고 있어요. 다시 시도해주세요';
          } else if (err.serverCode === 'UNSUPPORTED_REQUEST') {
            message = '아직 지원하지 않는 요청이에요. 언제·무엇을·어디로 보낼지 드러나게 다시 적어주세요';
          } else if (err.serverCode === 'AI_UNAVAILABLE') {
            message = 'AI가 잠시 응답하지 않아요. 다시 시도해주세요';
          } else {
            message = err.message;
          }
        }
        showToast(message, 'top');
      } finally {
        setLoading(false);
      }
    },
    [navigate, showToast],
  );

  const submit = useCallback(
    (prompt: string) => {
      if (!clientRepo.hasAiNoticeAck()) {
        pendingPromptRef.current = prompt;
        return;
      }
      runSubmit(prompt);
    },
    [runSubmit],
  );

  const onAiNoticeAck = useCallback(() => {
    const pending = pendingPromptRef.current;
    pendingPromptRef.current = null;
    if (pending) runSubmit(pending);
  }, [runSubmit]);

  return { submit, loading, onAiNoticeAck };
}
