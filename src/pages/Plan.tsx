import { useLocation } from 'react-router-dom';
import { Top, ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { MiniBar } from '@/components/MiniBar';
import { TossPurchase } from '@/components/TossPurchase';
import { PlanAdSlot } from '@/components/PlanAdSlot';
import '@/styles/plan.css';
import { useAppState } from '@/hooks/AppStateContext';
import { useAppToast } from '@/hooks/ToastProvider';
import { planRepo } from '@/lib/repos/planRepo';
import { formatNumber } from '@/lib/utils';
import { RUN_LIMIT, type PlanTier } from '@/lib/types';
import type { PlanLocationState } from '@/navigation/types';

const TIER_LABEL: Record<PlanTier, string> = { free: '무료', starter: '스타터', pro: '프로' };
const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'pro'];
const DAY_MS = 24 * 60 * 60 * 1000;

function limitLabel(tier: PlanTier): string {
  const limit = RUN_LIMIT[tier];
  return limit === null ? '무제한 실행' : `월 ${formatNumber(limit)}회`;
}

function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function Plan() {
  const { plan, usage, refresh } = useAppState();
  const location = useLocation();
  const { showToast } = useAppToast();
  const state = (location.state as PlanLocationState) ?? null;

  const currentLimit = RUN_LIMIT[plan.tier];
  const currentRatio = currentLimit === null ? 0 : Math.min(1, usage.runCount / Math.max(1, currentLimit));

  function grantTier(tier: 'starter' | 'pro') {
    return () => {
      const purchasedAt = new Date();
      const expiresAt = new Date(purchasedAt.getTime() + 30 * DAY_MS);
      planRepo.set({
        tier,
        purchasedAt: purchasedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      refresh();
      fireSuccessHaptic();
      showToast(`${TIER_LABEL[tier]} 30일 이용권 구매가 끝났어요`);
    };
  }

  function handlePurchaseError() {
    showToast('결제가 완료되지 않았어요');
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>요금제</Top.TitleParagraph>} />}>
      {state?.reason === 'quota_exceeded' && (
        <>
          <Card testId="quota-exceeded-notice">
            <Paragraph.Text typography="st13">
              이번 달 실행 횟수를 모두 사용했어요. 이용권을 구매하면 바로 더 실행할 수 있어요.
            </Paragraph.Text>
          </Card>
          <Spacing size={16} />
        </>
      )}

      <Card testId="current-plan-card">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`현재 ${TIER_LABEL[plan.tier]}`}
              bottom={
                currentLimit === null
                  ? '무제한 실행'
                  : `이번 달 ${formatNumber(usage.runCount)} / ${formatNumber(currentLimit)}회`
              }
            />
          }
        />
        <Spacing size={8} />
        <MiniBar ratio={currentRatio} testId="current-plan-usage" />
      </Card>

      <Spacing size={16} />

      {PLAN_ORDER.map((tier) => (
        <div key={tier}>
          <Card testId={`plan-card-${tier}`}>
            <ListRow contents={<ListRow.Texts type="2RowTypeA" top={TIER_LABEL[tier]} bottom={limitLabel(tier)} />} />
            {tier === 'starter' && (
              <>
                <Spacing size={8} />
                <TossPurchase
                  sku={import.meta.env.VITE_TOSS_IAP_SKU}
                  className="plan-purchase-button"
                  processProductGrant={async () => true}
                  onPurchased={grantTier('starter')}
                  onError={handlePurchaseError}
                >
                  스타터 30일 이용권 구매
                </TossPurchase>
              </>
            )}
            {tier === 'pro' && (
              <>
                <Spacing size={8} />
                <TossPurchase
                  sku={import.meta.env.VITE_TOSS_IAP_SKU_PRO}
                  className="plan-purchase-button"
                  processProductGrant={async () => true}
                  onPurchased={grantTier('pro')}
                  onError={handlePurchaseError}
                >
                  프로 30일 이용권 구매
                </TossPurchase>
              </>
            )}
          </Card>
          <Spacing size={8} />
        </div>
      ))}

      <PlanAdSlot />

      <Spacing size={32} />
      <Spacing size={32} />
    </ScreenScaffold>
  );
}
