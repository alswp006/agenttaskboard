import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, ListRow, Badge, Button, Spacing, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useAppState } from '@/hooks/AppStateContext';
import { useAppToast } from '@/hooks/ToastProvider';
import { ERROR_CODES } from '@/lib/errors';
import { RUN_LIMIT, type RouteState, type Flow, type RunStatus } from '@/lib/types';
import { format } from '@/lib/format';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState } from '@/components/StateView';
import { PlanAdSlot } from '@/components/PlanAdSlot';

const FLOW_LIMIT = 50;

const RUN_STATUS_BADGE: Record<RunStatus, { label: string; color: 'green' | 'red' }> = {
  success: { label: '성공', color: 'green' },
  failed: { label: '실패', color: 'red' },
};

// SDK는 WebView 밖에서 throw하므로 가드 필수 — 흰 화면 방지.
function fireHaptic(type: 'success' | 'error') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

function flowStatusBadge(flow: Flow) {
  if (!flow.lastRunStatus) {
    return { label: '실행 전', color: 'elephant' as const };
  }
  return RUN_STATUS_BADGE[flow.lastRunStatus];
}

export default function Home() {
  const navigate = useNavigate();
  const { flows, runs, usage, plan, isFree, consumeCorruption } = useAppState();
  const { showToast } = useAppToast();

  const corruptionToastShownRef = useRef(false);
  useEffect(() => {
    if (corruptionToastShownRef.current) return;
    const flowsCorrupted = consumeCorruption('flows');
    const usageCorrupted = consumeCorruption('usage');
    const planCorrupted = consumeCorruption('plan');
    if (flowsCorrupted || usageCorrupted || planCorrupted) {
      corruptionToastShownRef.current = true;
      showToast(ERROR_CODES.DATA_CORRUPTED, 'top');
    }
    // 마운트 1회만 — React 18 StrictMode 이중 호출에도 ref가 중복 노출을 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failedCount = runs.filter((run) => run.status === 'failed').length;
  const runLimit = RUN_LIMIT[plan.tier];
  const sortedFlows = [...flows].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  function handleGenerateClick() {
    navigate('/generate');
  }

  function handleManualCreateClick() {
    if (flows.length >= FLOW_LIMIT) {
      fireHaptic('error');
      showToast(`플로우는 최대 ${FLOW_LIMIT}개까지 만들 수 있어요`, 'top');
      return;
    }
    fireHaptic('success');
    navigate('/flows/new');
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>내 플로우</Top.TitleParagraph>} />}>
      {failedCount > 0 && (
        <>
          <ListRow
            data-testid="home-failed-alert"
            contents={<ListRow.Texts type="1RowTypeA" top={`실패한 실행 ${failedCount}건이 있어요`} />}
            right={
              <Badge size="medium" variant="weak" color="red">
                실패
              </Badge>
            }
            onClick={() =>
              navigate('/runs', { state: { filter: 'failed' } as RouteState['/runs'] })
            }
          />
          <Spacing size={8} />
        </>
      )}

      <ListRow
        data-testid="home-usage-row"
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top={
              runLimit === null
                ? `이번 달 실행 ${usage.runCount}회 · 무제한`
                : `이번 달 실행 ${usage.runCount}/${runLimit}회`
            }
            bottom={runLimit !== null ? <MiniBar ratio={usage.runCount / runLimit} /> : '무제한 플랜이에요'}
          />
        }
        onClick={() => navigate('/plan')}
      />

      <Spacing size={16} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Button variant="fill" size="large" display="block" onClick={handleGenerateClick}>
          AI로 만들기
        </Button>
        <Button variant="weak" size="large" display="block" onClick={handleManualCreateClick}>
          직접 만들기
        </Button>
      </div>

      <Spacing size={24} />

      {isFree && (
        <>
          <Card>
            <ListRow
              data-testid="home-plan-banner"
              onClick={() => navigate('/plan')}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top="무료 플랜을 이용 중이에요"
                  bottom="더 많은 실행 횟수가 필요하면 요금제를 둘러보세요"
                />
              }
            />
          </Card>
          <Spacing size={16} />
        </>
      )}

      {sortedFlows.length === 0 ? (
        <div data-testid="home-empty">
          <EmptyState
            icon={<Asset.ContentIcon name="iconStarRegular" alt="플로우 없음" />}
            title="아직 만든 플로우가 없어요"
            description="템플릿으로 빠르게 시작할 수 있어요"
            action={
              <Button variant="weak" onClick={() => navigate('/templates')}>
                템플릿 둘러보기
              </Button>
            }
          />
        </div>
      ) : (
        <div data-testid="flow-list">
          {sortedFlows.map((flow) => {
            const badge = flowStatusBadge(flow);
            return (
              <ListRow
                key={flow.id}
                data-testid="flow-row"
                contents={<ListRow.Texts type="2RowTypeA" top={flow.name} bottom={format(flow)} />}
                right={
                  <Badge size="medium" variant="weak" color={badge.color}>
                    {badge.label}
                  </Badge>
                }
                onClick={() => navigate(`/flows/${flow.id}`)}
              />
            );
          })}
        </div>
      )}

      <Spacing size={16} />
      <PlanAdSlot />

      <Spacing size={32} />
      <Spacing size={32} />
    </ScreenScaffold>
  );
}
