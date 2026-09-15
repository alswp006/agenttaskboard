import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '@/api/client';
import { clientRepo } from '@/lib/repos/clientRepo';
import { useAppToast } from '@/hooks/ToastProvider';
import { ERROR_CODES } from '@/lib/errors';
import type { FlowDraft, RouteState } from '@/lib/types';

interface GenerateResponseBody {
  draft: FlowDraft;
  missingFields: string[];
}

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
        const { draft, missingFields } = (await apiClient.post('/api/flows/generate', {
          prompt,
        })) as GenerateResponseBody;
        navigate('/generate/result', {
          state: { prompt, draft, missingFields } as RouteState['/generate/result'],
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : ERROR_CODES.NETWORK_ERROR;
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
