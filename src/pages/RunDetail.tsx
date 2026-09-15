import { useNavigate, useParams } from 'react-router-dom';
import { Top, ListRow, Badge, Paragraph, Asset, Button, Spacing } from '@toss/tds-mobile';
import type { RunStatus, StepResult } from '@/lib/types';
import { runRepo } from '@/lib/repos/runRepo';
import { formatDuration } from '@/lib/format';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { PlanAdSlot } from '@/components/PlanAdSlot';

const STATUS_LABEL: Record<RunStatus, string> = {
  success: '성공',
  failed: '실패',
};

const STEP_STATUS_LABEL: Record<StepResult['status'], string> = {
  success: '성공',
  failed: '실패',
  skipped: '건너뜀',
};

const STEP_STATUS_COLOR: Record<StepResult['status'], 'green' | 'red' | 'elephant'> = {
  success: 'green',
  failed: 'red',
  skipped: 'elephant',
};

// KST 기준 '9월 16일 오후 3:24' 형태로 시작 시각을 표시한다.
function formatKSTStartedAt(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function RunDetail() {
  const navigate = useNavigate();
  const { runId } = useParams<{ runId: string }>();
  const run = runId ? runRepo.get(runId) : null;

  if (!run) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>실행 상세</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconClockRegular" alt="실행 기록 없음" />}
          title="실행 기록을 찾을 수 없어요"
          action={
            <Button variant="weak" onClick={() => navigate('/runs')}>
              실행 로그로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const summaryBottom =
    run.durationMs !== null
      ? `${formatKSTStartedAt(run.startedAt)} · ${formatDuration(run.durationMs)}`
      : formatKSTStartedAt(run.startedAt);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>{run.flowName}</Top.TitleParagraph>} />}>
      <Card testId="run-summary-card">
        <Paragraph.Text typography="t3">{STATUS_LABEL[run.status]}</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="st13">{summaryBottom}</Paragraph.Text>
      </Card>
      <Spacing size={16} />
      <Card testId="run-steps-card">
        {run.steps.map((step, i) => (
          <ListRow
            key={i}
            contents={<ListRow.Texts type="2RowTypeA" top={step.label} bottom={step.message ?? ''} />}
            right={
              <Badge size="small" variant="weak" color={STEP_STATUS_COLOR[step.status]}>
                {STEP_STATUS_LABEL[step.status]}
              </Badge>
            }
          />
        ))}
      </Card>
      {run.aiOutput && (
        <>
          <Spacing size={16} />
          <Card testId="run-ai-output-card">
            <div data-testid="ai-generated-badge">
              <Badge size="small" variant="weak" color="blue">
                AI가 생성한 결과입니다
              </Badge>
            </div>
            <Spacing size={12} />
            <Paragraph.Text typography="t6">{run.aiOutput}</Paragraph.Text>
          </Card>
        </>
      )}
      <Spacing size={16} />
      <PlanAdSlot />
    </ScreenScaffold>
  );
}
