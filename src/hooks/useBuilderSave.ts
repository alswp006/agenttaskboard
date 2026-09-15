import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Flow, FlowDraft } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { scheduleService } from '@/services/scheduleService';
import { validateDraft } from '@/lib/validateDraft';
import { FlowLimitError } from '@/lib/errors';
import { useAppState } from '@/hooks/AppStateContext';
import { useAppToast } from '@/hooks/ToastProvider';

interface SaveOptions {
  source: Flow['source'];
  templateId: string | null;
  missingFields?: string[];
}

interface UseBuilderSaveArgs {
  /** 수정 대상 플로우 id. null이면 새 플로우 생성 */
  flowId: string | null;
}

/**
 * 빌더 저장 흐름: validateDraft → 생성/수정 → (enabled면) 스케줄 재등록 → refresh → Toast → navigate.
 * scheduleService.enable은 트리거가 manual이면 내부적으로 DELETE(disable)로 분기한다.
 */
export function useBuilderSave({ flowId }: UseBuilderSaveArgs) {
  const navigate = useNavigate();
  const { refresh } = useAppState();
  const { showToast } = useAppToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(draft: FlowDraft, options: SaveOptions) {
    const result = validateDraft(draft, options.missingFields ?? []);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const flow = flowId
        ? flowRepo.update(flowId, draft)
        : flowRepo.create({ draft, source: options.source, templateId: options.templateId });

      if (flow.enabled) {
        try {
          await scheduleService.enable(flow.id);
        } catch {
          showToast('예약 실행 설정을 다시 확인해주세요');
        }
      }

      refresh();
      showToast(flowId ? '플로우를 수정했어요' : '플로우를 만들었어요');
      navigate(`/flows/${flow.id}`);
    } catch (err) {
      console.error('DEBUG useBuilderSave error', err);
      if (err instanceof FlowLimitError) {
        showToast(err.message.replace(/^FlowLimitError:\s*/, ''));
      } else {
        showToast('저장에 실패했어요. 잠시 후 다시 시도해주세요');
      }
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, errors };
}
