import { useEffect, useState } from 'react';
import { BottomSheet, Button, Chip, ChipItem, Paragraph, Spacing, TextArea } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { AiStep, AiTask } from '@/lib/types';

const TASKS: { value: AiTask; label: string }[] = [
  { value: 'summarize', label: '요약' },
  { value: 'classify', label: '분류' },
  { value: 'translate', label: '번역' },
  { value: 'custom', label: '직접 입력' },
];

const LANGUAGES: { value: NonNullable<AiStep['targetLanguage']>; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: '영어' },
  { value: 'ja', label: '일본어' },
  { value: 'zh', label: '중국어' },
];

function tick() {
  try {
    generateHapticFeedback({ type: 'tickWeak' });
  } catch {
    // 브릿지 없는 환경에서는 throw — 무시
  }
}

interface AiStepSheetProps {
  open: boolean;
  aiStep: AiStep;
  onDone: (aiStep: AiStep) => void;
  onClose: () => void;
}

export function AiStepSheet({ open, aiStep, onDone, onClose }: AiStepSheetProps) {
  const [local, setLocal] = useState<AiStep>(aiStep);

  useEffect(() => {
    if (open) setLocal(aiStep);
  }, [open, aiStep]);

  const instructionRequired = local.task === 'classify' || local.task === 'custom';
  const instructionError =
    instructionRequired && local.instruction.trim().length === 0
      ? local.task === 'classify'
        ? '분류 기준을 입력해주세요'
        : 'AI에게 시킬 일을 입력해주세요'
      : null;
  const languageError = local.task === 'translate' && !local.targetLanguage ? '번역할 언어를 선택해주세요' : null;

  const isValid = !instructionError && !languageError;

  const selectTask = (task: AiTask) => {
    tick();
    setLocal({
      task,
      instruction: local.instruction,
      targetLanguage: task === 'translate' ? local.targetLanguage : null,
    });
  };

  const handleDone = () => {
    if (!isValid) return;
    onDone(local);
    onClose();
  };

  return (
    <BottomSheet open={open} onDimmerClick={onClose}>
      <Paragraph.Text typography="st1">AI 처리 설정</Paragraph.Text>
      <Spacing size={16} />
      <Paragraph.Text typography="st3">작업 종류</Paragraph.Text>
      <Spacing size={8} />
      <Chip kind="select" wrap>
        {TASKS.map((task) => (
          <ChipItem key={task.value} selected={local.task === task.value} onClick={() => selectTask(task.value)}>
            {task.label}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={16} />
      <TextArea
        variant="box"
        label="지시문"
        placeholder={local.task === 'classify' ? '예: 긴급/일반으로 분류' : '예: 핵심만 3줄로 정리해줘'}
        value={local.instruction}
        maxLength={500}
        onChange={(e) => setLocal({ ...local, instruction: e.target.value })}
      />
      {instructionError && (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
            {instructionError}
          </Paragraph.Text>
        </>
      )}

      {local.task === 'translate' && (
        <>
          <Spacing size={16} />
          <Paragraph.Text typography="st3">번역할 언어</Paragraph.Text>
          <Spacing size={8} />
          <Chip kind="select">
            {LANGUAGES.map((lang) => (
              <ChipItem
                key={lang.value}
                selected={local.targetLanguage === lang.value}
                onClick={() => {
                  tick();
                  setLocal({ ...local, targetLanguage: lang.value });
                }}
              >
                {lang.label}
              </ChipItem>
            ))}
          </Chip>
          {languageError && (
            <>
              <Spacing size={4} />
              <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
                {languageError}
              </Paragraph.Text>
            </>
          )}
        </>
      )}

      <Spacing size={24} />
      <Button display="block" variant="fill" disabled={!isValid} onClick={handleDone}>
        완료
      </Button>
    </BottomSheet>
  );
}
