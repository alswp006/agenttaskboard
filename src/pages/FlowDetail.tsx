import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Top,
  ListRow,
  Badge,
  Switch,
  Button,
  Paragraph,
  Spacing,
  Asset,
  AlertDialog,
} from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useAppState } from '@/hooks/AppStateContext';
import { useAppToast } from '@/hooks/ToastProvider';
import { flowRepo } from '@/lib/repos/flowRepo';
import { clientRepo } from '@/lib/repos/clientRepo';
import { runService } from '@/services/runService';
import { scheduleService } from '@/services/scheduleService';
import { ApiError } from '@/api/client';
import { format } from '@/lib/format';
import type { Action } from '@/lib/types';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { PlanAdSlot } from '@/components/PlanAdSlot';
import { AiNoticeDialog } from '@/components/AiNoticeDialog';

function actionUrl(action: Action): string | null {
  if (action.type === 'slack_webhook') return action.webhookUrl;
  if (action.type === 'google_sheet_append') return action.sheetUrl;
  return null;
}

function formatKSTDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// SDK는 WebView 밖에서 throw하므로 가드 필수 — 흰 화면 방지.
function fireHaptic(type: 'tickWeak' | 'error') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function FlowDetail() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { refresh } = useAppState();
  const { showToast } = useAppToast();

  const [flow, setFlow] = useState(() => (flowId ? flowRepo.get(flowId) : null));
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [awaitingAiAck, setAwaitingAiAck] = useState(false);

  async function toggleSchedule() {
    if (!flow || scheduleBusy) return;
    setScheduleBusy(true);
    try {
      const updated = flow.enabled
        ? await scheduleService.disable(flow.id)
        : await scheduleService.enable(flow.id);
      setFlow(updated);
      fireHaptic('tickWeak');
    } catch (err) {
      showToast(errorMessage(err, '스케줄 설정을 변경할 수 없어요'), 'top');
    } finally {
      setScheduleBusy(false);
    }
  }

  async function runNow() {
    if (!flow || running) return;
    setRunning(true);
    try {
      const run = await runService.runNow(flow.id);
      refresh();
      showToast('실행을 시작했어요', 'bottom');
      navigate(`/runs/${run.id}`);
    } catch (err) {
      showToast(errorMessage(err, '실행에 실패했어요'), 'top');
    } finally {
      setRunning(false);
    }
  }

  function handleRunClick() {
    if (clientRepo.hasAiNoticeAck()) {
      void runNow();
    } else {
      setAwaitingAiAck(true);
    }
  }

  function handleAiAck() {
    setAwaitingAiAck(false);
    void runNow();
  }

  function handleDelete() {
    if (!flow) return;
    flowRepo.delete(flow.id);
    fireHaptic('error');
    setDeleteOpen(false);
    navigate('/');
  }

  if (!flow) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>플로우</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconStarRegular" alt="플로우 없음" />}
          title="플로우를 찾을 수 없어요"
          description="삭제되었거나 잘못된 경로예요"
          action={
            <Button variant="weak" onClick={() => navigate('/')}>
              홈으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const [triggerLine, aiStepLine, actionsLine] = format(flow).split(' · ');

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{flow.name}</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="지금 실행" onClick={handleRunClick} loading={running} />}
    >
      {flow.source === 'ai' && (
        <>
          <Badge size="small" variant="weak" color="blue">
            AI 생성
          </Badge>
          <Spacing size={12} />
        </>
      )}

      <Card testId="flow-summary-card">
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="트리거" bottom={triggerLine} />} />
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="AI 처리" bottom={aiStepLine} />} />
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="액션" bottom={actionsLine} />} />
        {flow.actions.map((action, idx) => {
          const url = actionUrl(action);
          return url ? (
            <Paragraph.Text key={idx} typography="st13">
              {url}
            </Paragraph.Text>
          ) : null;
        })}
      </Card>

      <Spacing size={12} />

      <ListRow
        contents={
          <ListRow.Texts
            type="Right2RowTypeA"
            top="예약 실행"
            bottom={flow.nextRunAt ? formatKSTDateTime(flow.nextRunAt) : '설정된 예약이 없어요'}
          />
        }
        right={
          <Switch
            checked={flow.enabled}
            disabled={flow.trigger.type === 'manual' || scheduleBusy}
            onChange={() => toggleSchedule()}
          />
        }
      />

      <ListRow
        contents={
          <ListRow.Texts
            type="Right2RowTypeA"
            top="최근 실행"
            bottom={
              flow.lastRunAt
                ? `${formatKSTDateTime(flow.lastRunAt)} · ${flow.lastRunStatus === 'success' ? '성공' : '실패'}`
                : '아직 실행한 적이 없어요'
            }
          />
        }
      />

      <Spacing size={12} />
      <PlanAdSlot />
      <Spacing size={12} />

      <ListRow
        contents={<ListRow.Texts type="1RowTypeA" top="플로우 삭제" />}
        right={
          <Button variant="weak" size="small" onClick={() => setDeleteOpen(true)}>
            삭제
          </Button>
        }
      />

      <Spacing size={80} />

      <AlertDialog
        open={deleteOpen}
        title="플로우를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        alertButton={<AlertDialog.AlertButton onClick={handleDelete}>삭제</AlertDialog.AlertButton>}
        onClose={() => setDeleteOpen(false)}
      />

      {awaitingAiAck && <AiNoticeDialog onAck={handleAiAck} />}
    </ScreenScaffold>
  );
}
