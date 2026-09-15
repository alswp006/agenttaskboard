import { useState } from 'react';
import { AlertDialog } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { clientRepo } from '@/lib/repos/clientRepo';

interface AiNoticeDialogProps {
  onAck: () => void;
}

// 생성형 AI 첫 이용 고지 — atb:aiNoticeAck가 없을 때만 뜬다. "확인" 전에는 저장·onAck 없음.
export function AiNoticeDialog({ onAck }: AiNoticeDialogProps) {
  const [open, setOpen] = useState(() => !clientRepo.hasAiNoticeAck());

  function ack() {
    clientRepo.acknowledgeAiNotice();
    setOpen(false);
    try {
      generateHapticFeedback({ type: 'success' });
    } catch {
      /* WebView 밖 — 무시 */
    }
    onAck();
  }

  return (
    <AlertDialog
      open={open}
      title="이 서비스는 생성형 AI를 활용합니다"
      description="AI가 만든 플로우와 실행 결과는 부정확할 수 있어요. 내용을 확인한 뒤 사용해주세요"
      alertButton={<AlertDialog.AlertButton onClick={ack}>확인</AlertDialog.AlertButton>}
      onClose={ack}
    />
  );
}
