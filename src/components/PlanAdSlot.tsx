import { AdSlot } from './AdSlot';
import { useAppState } from '@/hooks/AppStateContext';

interface PlanAdSlotProps {
  className?: string;
  /** 'card' (기본) | 'expanded' */
  variant?: 'card' | 'expanded';
}

/**
 * 무료 플랜에서만 배너 광고를 보여주는 래퍼.
 * spec: 콘텐츠 섹션 사이·목록 뒤에만 배치 — 입력 폼/SubmitFooter 위에는 두지 않는다.
 * pro/starter는 isFree가 false이므로 아무것도 렌더링하지 않는다(null).
 */
export function PlanAdSlot({ className, variant }: PlanAdSlotProps) {
  const { isFree } = useAppState();

  // 유료 플랜(starter/pro)에서는 배너를 아예 렌더링하지 않는다.
  if (!isFree) return null;

  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? '';
  return <AdSlot adGroupId={adGroupId} className={className} variant={variant} />;
}
