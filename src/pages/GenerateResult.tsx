import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, ListRow, Badge, Paragraph, Asset, Button, Spacing } from '@toss/tds-mobile';
import { useAppState } from '@/hooks/AppStateContext';
import { flowRepo } from '@/lib/repos/flowRepo';
import { FlowLimitError } from '@/lib/errors';
import { validateDraft } from '@/lib/validateDraft';
import { format } from '@/lib/format';
import type { RouteState } from '@/lib/types';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { ButtonStack } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';

const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? 'generate-result-preview';

export default function GenerateResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFree } = useAppState();
  const [saveError, setSaveError] = useState<string | null>(null);

  const state = (location.state as RouteState['/generate/result']) ?? null;

  if (!state || !state.draft) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>이렇게 만들었어요</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconStarRegular" alt="생성 결과 없음" />}
          title="생성 결과가 없어요"
          description="처음부터 다시 요청해주세요"
          action={
            <Button variant="weak" onClick={() => navigate('/generate')}>
              다시 만들기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const { draft, missingFields } = state;
  const safeMissingFields = missingFields ?? [];
  const [triggerLine, aiStepLine, actionsLine] = format(draft).split(' · ');

  function handleSave() {
    if (!validateDraft(draft).valid) {
      setSaveError('빠진 정보가 있어요. "수정해서 저장"으로 채운 뒤 저장해주세요');
      return;
    }
    try {
      const flow = flowRepo.create({ draft, source: 'ai', templateId: null });
      navigate(`/flows/${flow.id}`);
    } catch (err) {
      setSaveError(
        err instanceof FlowLimitError
          ? err.message.replace(/^FlowLimitError:\s*/, '')
          : '저장에 실패했어요. 잠시 후 다시 시도해주세요',
      );
    }
  }

  function handleEditAndSave() {
    navigate('/flows/new', {
      state: {
        draft,
        source: 'ai',
        templateId: null,
        missingFields: safeMissingFields,
      } as RouteState['/flows/new'],
    });
  }

  const preview = (
    <>
      <div data-testid="ai-generated-badge">
        <Badge size="small" variant="weak" color="blue">
          AI가 생성한 결과입니다
        </Badge>
      </div>
      <Spacing size={12} />
      <Card testId="generate-result-card">
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="트리거" bottom={triggerLine} />} />
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="AI 처리" bottom={aiStepLine} />} />
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="액션" bottom={actionsLine} />} />
      </Card>
      {safeMissingFields.length > 0 && (
        <>
          <Spacing size={12} />
          <Paragraph.Text typography="st13">
            일부 정보가 비어 있어요. 수정해서 저장에서 채워주세요
          </Paragraph.Text>
        </>
      )}
      {saveError && (
        <>
          <Spacing size={12} />
          <Paragraph.Text typography="st13">{saveError}</Paragraph.Text>
        </>
      )}
    </>
  );

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>이렇게 만들었어요</Top.TitleParagraph>} />}
      bottom={
        <ButtonStack
          primary={{ label: '저장하기', onClick: handleSave }}
          secondary={{ label: '수정해서 저장', onClick: handleEditAndSave }}
        />
      }
    >
      {isFree ? <TossRewardAd slotId={AD_SLOT_ID}>{preview}</TossRewardAd> : preview}
    </ScreenScaffold>
  );
}
