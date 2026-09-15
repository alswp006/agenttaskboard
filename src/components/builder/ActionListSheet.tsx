import { Badge, BottomSheet, Button, ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { Action } from '@/lib/types';

function actionLabel(action: Action): string {
  switch (action.type) {
    case 'in_app':
      return '인앱 알림';
    case 'slack_webhook':
      return '슬랙 웹훅';
    case 'google_sheet_append':
      return '구글시트 추가';
  }
}

function tick() {
  try {
    generateHapticFeedback({ type: 'tickWeak' });
  } catch {
    // 브릿지 없는 환경(로컬/검수 PC)에서는 throw — 무시
  }
}

interface ActionListSheetProps {
  open: boolean;
  actions: Action[];
  onAdd: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}

export function ActionListSheet({ open, actions, onAdd, onMove, onRemove, onClose }: ActionListSheetProps) {
  const canAdd = actions.length < 3;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    tick();
    onMove(index, direction);
  };

  const handleRemove = (index: number) => {
    tick();
    onRemove(index);
  };

  const handleAdd = () => {
    if (!canAdd) return;
    tick();
    onAdd();
  };

  return (
    <BottomSheet open={open} onDimmerClick={onClose}>
      <Paragraph.Text typography="st1">액션 설정</Paragraph.Text>
      <Spacing size={16} />
      <Paragraph.Text typography="st3">추가된 액션 ({actions.length}/3)</Paragraph.Text>
      <Spacing size={8} />
      {actions.map((action, index) => (
        <ListRow
          key={`${action.type}-${index}`}
          contents={<ListRow.Texts type="1RowTypeA" top={actionLabel(action)} />}
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                aria-label="위로"
                variant="weak"
                size="small"
                disabled={index === 0}
                onClick={() => handleMove(index, 'up')}
              >
                위로
              </Button>
              <Button
                aria-label="아래로"
                variant="weak"
                size="small"
                disabled={index === actions.length - 1}
                onClick={() => handleMove(index, 'down')}
              >
                아래로
              </Button>
              <Button aria-label="삭제" variant="weak" size="small" onClick={() => handleRemove(index)}>
                삭제
              </Button>
            </div>
          }
        />
      ))}

      <Spacing size={16} />
      <Button display="block" variant="weak" disabled={!canAdd} onClick={handleAdd}>
        액션 추가
      </Button>
      <Spacing size={4} />
      <Paragraph.Text typography="st13">액션은 최대 3개까지 추가할 수 있어요</Paragraph.Text>

      <Spacing size={24} />
      <Paragraph.Text typography="st3">준비 중인 연동</Paragraph.Text>
      <Spacing size={8} />
      <ListRow
        contents={<ListRow.Texts type="1RowTypeA" top="카카오톡" />}
        right={
          <Badge size="small" variant="weak" color="elephant">
            준비 중
          </Badge>
        }
      />
      <ListRow
        contents={<ListRow.Texts type="1RowTypeA" top="네이버 캘린더" />}
        right={
          <Badge size="small" variant="weak" color="elephant">
            준비 중
          </Badge>
        }
      />

      <Spacing size={24} />
      <Button display="block" variant="fill" onClick={onClose}>
        완료
      </Button>
    </BottomSheet>
  );
}
