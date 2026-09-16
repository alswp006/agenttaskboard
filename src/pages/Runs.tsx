import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, Tab, ListRow, Badge, Paragraph, Asset, Button, Spacing, AlertDialog } from '@toss/tds-mobile';
import type { RunLog, RunStatus } from '@/lib/types';
import type { RunsLocationState, PlanLocationState } from '@/navigation/types';
import { useAppState } from '@/hooks/AppStateContext';
import { useRunSync } from '@/hooks/useRunSync';
import { calculateSuccessRateLastWeek } from '@/lib/metrics';
import { formatDuration } from '@/lib/format';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { MiniBar } from '@/components/MiniBar';
import { Sparkline } from '@/components/Sparkline';
import { EmptyState, LoadingState } from '@/components/StateView';
import { PlanAdSlot } from '@/components/PlanAdSlot';

const PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type FilterKey = 'all' | 'success' | 'failed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'success', label: '성공' },
  { key: 'failed', label: '실패' },
];

const STATUS_LABEL: Record<RunStatus, string> = { success: '성공', failed: '실패' };
const STATUS_COLOR: Record<RunStatus, 'green' | 'red'> = { success: 'green', failed: 'red' };
const TRIGGER_LABEL: Record<RunLog['trigger'], string> = { manual: '수동 실행', schedule: '예약 실행' };

// KST 기준 '9월 16일 09:00' 형태로 시작 시각을 표시한다.
function formatKSTStartedAt(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function kstDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// 최근 7일(KST, 오늘 포함) 일별 실행 수 — 오래된 날 → 오늘 순.
function buildWeeklyTrend(runs: RunLog[]): number[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    keys.push(kstDateKey(new Date(Date.now() - i * DAY_MS).toISOString()));
  }
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const run of runs) {
    const key = kstDateKey(run.startedAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((key) => counts.get(key) ?? 0);
}

export default function Runs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { runs } = useAppState();
  const { status, retry, quotaExceeded, dismissQuotaExceeded } = useRunSync();

  const routeState = location.state as RunsLocationState;
  const [filter, setFilter] = useState<FilterKey>(routeState?.filter ?? 'all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function handleFilterChange(next: FilterKey) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleQuotaConfirm() {
    dismissQuotaExceeded();
    navigate('/plan', { state: { reason: 'quota_exceeded' } as PlanLocationState });
  }

  const sorted = useMemo(
    () => [...runs].sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0)),
    [runs],
  );
  const filtered = useMemo(
    () => (filter === 'all' ? sorted : sorted.filter((run) => run.status === filter)),
    [sorted, filter],
  );
  const visible = filtered.slice(0, visibleCount);

  const week = calculateSuccessRateLastWeek(runs);
  const weekFailedCount = week.totalCount - week.successCount;
  const weeklyTrend = useMemo(() => buildWeeklyTrend(runs), [runs]);

  const top = <Top title={<Top.TitleParagraph>실행 로그</Top.TitleParagraph>} />;

  if (status === 'syncing' && runs.length === 0) {
    return (
      <ScreenScaffold top={top}>
        <LoadingState rows={3} testId="run-log-loading" />
      </ScreenScaffold>
    );
  }

  if (status === 'error' && runs.length === 0) {
    return (
      <ScreenScaffold top={top}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconWarningRegular" alt="실행 기록 불러오기 실패" />}
          title="실행 기록을 불러오지 못했어요"
          description="네트워크 연결을 확인하고 다시 시도해주세요"
          action={
            <>
              <Button variant="weak" onClick={retry}>
                다시 시도
              </Button>
              <Spacing size={8} />
              <Button variant="weak" onClick={() => navigate('/flows/new')}>
                플로우 만들기
              </Button>
            </>
          }
        />
      </ScreenScaffold>
    );
  }

  if (status === 'idle' && runs.length === 0) {
    return (
      <ScreenScaffold top={top}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconClockRegular" alt="실행 기록 없음" />}
          title="아직 실행 기록이 없어요"
          action={
            <Button variant="weak" onClick={() => navigate('/flows/new')}>
              플로우 만들기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={top}>
      {weekFailedCount > 0 && (
        <>
          <div data-testid="error-alert-card" onClick={() => handleFilterChange('failed')}>
            <Card>
              <Paragraph.Text typography="t6">{`실패한 실행 ${weekFailedCount}건이 있어요`}</Paragraph.Text>
            </Card>
          </div>
          <Spacing size={12} />
        </>
      )}

      <Card testId="run-summary-hero">
        <Paragraph.Text typography="st11">최근 7일</Paragraph.Text>
        <Spacing size={4} />
        <CountUp value={week.totalCount} unit="건" typography="t1" />
        <Spacing size={4} />
        <Paragraph.Text typography="t6">{`성공률 ${Math.round(week.successRate * 100)}%`}</Paragraph.Text>
        <Spacing size={12} />
        <MiniBar
          ratio={week.totalCount === 0 ? 0 : week.successCount / week.totalCount}
          testId="run-ratio-minibar"
        />
        <Spacing size={12} />
        <Sparkline data={weeklyTrend} testId="run-trend-sparkline" />
      </Card>

      <Spacing size={16} />

      <Tab onChange={(index: number) => handleFilterChange(FILTERS[index].key)}>
        {FILTERS.map((f, i) => (
          <Tab.Item key={f.key} selected={filter === f.key} onClick={() => handleFilterChange(f.key)}>
            {f.label}
          </Tab.Item>
        ))}
      </Tab>

      <Spacing size={12} />

      {filtered.length === 0 ? (
        <Paragraph.Text typography="t6">해당하는 실행 기록이 없어요</Paragraph.Text>
      ) : (
        <div data-testid="run-log-list" role="list">
          {visible.map((run) => (
            <ListRow
              key={run.id}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={run.flowName}
                  bottom={`${formatKSTStartedAt(run.startedAt)} · ${TRIGGER_LABEL[run.trigger]}${
                    run.durationMs !== null ? ` · ${formatDuration(run.durationMs)}` : ''
                  }`}
                />
              }
              right={
                <Badge size="small" variant="weak" color={STATUS_COLOR[run.status]}>
                  {STATUS_LABEL[run.status]}
                </Badge>
              }
              onClick={() => navigate(`/runs/${run.id}`)}
            />
          ))}
        </div>
      )}

      {visibleCount < filtered.length && (
        <>
          <Spacing size={12} />
          <Button
            variant="weak"
            display="block"
            onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))}
          >
            더 보기
          </Button>
        </>
      )}

      <Spacing size={16} />
      <PlanAdSlot />
      <Spacing size={32} />
      <Spacing size={32} />

      <AlertDialog
        open={quotaExceeded}
        title="이번 달 실행 횟수를 모두 사용해 예약 실행을 멈췄어요"
        alertButton={
          <AlertDialog.AlertButton onClick={handleQuotaConfirm}>요금제 보기</AlertDialog.AlertButton>
        }
        onClose={dismissQuotaExceeded}
      />
    </ScreenScaffold>
  );
}
