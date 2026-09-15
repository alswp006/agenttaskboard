import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Top, TextArea, Paragraph, Spacing } from '@toss/tds-mobile';
import type { RouteState } from '@/lib/types';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { AiNoticeDialog } from '@/components/AiNoticeDialog';
import { useKeyboardAware } from '@/hooks/useKeyboardAware';
import { useGenerateSubmit } from '@/hooks/useGenerateSubmit';

const PROMPT_PLACEHOLDER = '예: 매주 월요일 9시에 뉴스를 요약해서 슬랙으로 보내줘';
const PROMPT_MAX_LENGTH = 500;

export default function Generate() {
  const location = useLocation();
  const routeState = (location.state as RouteState['/generate']) ?? null;
  const [prompt, setPrompt] = useState(routeState?.prompt ?? '');
  const { onFieldFocus } = useKeyboardAware();
  const { submit, loading, onAiNoticeAck } = useGenerateSubmit();

  const valid = prompt.trim().length > 0;

  function handleSubmit() {
    submit(prompt.trim());
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>AI로 플로우 만들기</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="만들기" onClick={handleSubmit} disabled={!valid} loading={loading} />}
    >
      <Paragraph.Text typography="st11">
        자동화하고 싶은 일을 적어주세요. AI가 트리거와 실행 단계를 만들어 드릴게요.
      </Paragraph.Text>
      <Spacing size={16} />
      <TextArea
        variant="box"
        label="무엇을 자동화할까요"
        placeholder={PROMPT_PLACEHOLDER}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onFocus={onFieldFocus}
        maxLength={PROMPT_MAX_LENGTH}
      />
      <AiNoticeDialog onAck={onAiNoticeAck} />
    </ScreenScaffold>
  );
}
