import { useReducer, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Top, TextField, ListRow, Paragraph, Spacing, Asset, ConfirmDialog, IconButton, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { Flow, FlowDraft, InputSource, RouteState } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { format } from '@/lib/format';
import { useKeyboardAware } from '@/hooks/useKeyboardAware';
import { useBuilderSave } from '@/hooks/useBuilderSave';
import { draftReducer } from '@/components/builder/draftReducer';
import { TriggerInputSheet } from '@/components/builder/TriggerInputSheet';
import { AiStepSheet } from '@/components/builder/AiStepSheet';
import { ActionListSheet } from '@/components/builder/ActionListSheet';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';

const EMPTY_DRAFT: FlowDraft = {
  name: '',
  input: { type: 'text', text: '' },
  trigger: { type: 'manual' },
  aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
  actions: [{ type: 'in_app' }],
};

type SheetKind = 'trigger' | 'ai' | 'actions' | null;

function inputSummary(input: InputSource): string {
  if (input.type === 'text') return '텍스트 입력';
  if (input.type === 'google_sheet') return '구글시트';
  return input.keyword ? `뉴스 키워드 · ${input.keyword}` : '뉴스 키워드';
}

// errors 객체에서 prefix(정확히 일치 또는 'prefix.'로 시작하는 키) 중 첫 메시지를 찾는다.
function errorFor(errors: Record<string, string>, ...prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    const key = Object.keys(errors).find((k) => k === prefix || k.startsWith(`${prefix}.`));
    if (key) return errors[key];
  }
  return null;
}

function tick(type: 'tickWeak' | 'tickMedium') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    // 브릿지 없는 환경(로컬/검수 PC/jsdom)에서는 throw — 무시
  }
}

function computeInitialDraft(
  isEdit: boolean,
  originalFlow: Flow | null,
  routeState: RouteState['/flows/new'],
): FlowDraft {
  if (isEdit) {
    if (!originalFlow) return EMPTY_DRAFT;
    const { name, input, trigger, aiStep, actions } = originalFlow;
    return { name, input, trigger, aiStep, actions };
  }
  return routeState?.draft ?? EMPTY_DRAFT;
}

export default function Builder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { flowId } = useParams<{ flowId: string }>();
  const isEdit = !!flowId;

  const routeState = !isEdit ? ((location.state as RouteState['/flows/new']) ?? null) : null;

  const [originalFlow] = useState<Flow | null>(() => (flowId ? flowRepo.get(flowId) : null));
  const notFound = isEdit && !originalFlow;

  const [initialDraft] = useState<FlowDraft>(() => computeInitialDraft(isEdit, originalFlow, routeState));
  const [draft, dispatch] = useReducer(draftReducer, initialDraft);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { onFieldFocus, footerOffset, singleLineEnterBlur } = useKeyboardAware();

  const { save, saving, errors } = useBuilderSave({ flowId: flowId ?? null });

  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  function attemptLeave() {
    if (dirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate(-1);
  }

  function confirmLeave() {
    tick('tickMedium');
    setShowLeaveConfirm(false);
    navigate(-1);
  }

  if (notFound) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>플로우 수정</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconWarningRegular" alt="플로우 없음" />}
          title="플로우를 찾을 수 없어요"
          description="삭제됐거나 잘못된 경로예요"
          action={
            <Button variant="weak" onClick={() => navigate('/')}>
              홈으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const [triggerLine, aiStepLine, actionsLine] = format(draft).split(' · ');

  const nameError = errors.name ?? null;
  const triggerError = errorFor(errors, 'trigger', 'input');
  const aiError = errorFor(errors, 'aiStep');
  const actionsError = errorFor(errors, 'actions');

  function handleSave() {
    save(draft, {
      source: isEdit ? (originalFlow?.source ?? 'manual') : (routeState?.source ?? 'manual'),
      templateId: isEdit ? (originalFlow?.templateId ?? null) : (routeState?.templateId ?? null),
      missingFields: routeState?.missingFields ?? [],
    });
  }

  return (
    <>
      <ScreenScaffold
        top={
          <Top
            title={<Top.TitleParagraph>{isEdit ? '플로우 수정' : '새 플로우'}</Top.TitleParagraph>}
            right={<IconButton aria-label="닫기" name="iconCloseRegular" onClick={attemptLeave} />}
          />
        }
        bottom={
          <div style={{ transform: `translateY(-${footerOffset}px)` }}>
            <SubmitFooter label="저장하기" loading={saving} onClick={handleSave} />
          </div>
        }
      >
        <TextField
          variant="line"
          label="이름"
          placeholder="예: 아침 브리핑"
          value={draft.name}
          maxLength={30}
          enterKeyHint="done"
          hasError={!!nameError}
          help={nameError ?? undefined}
          onFocus={onFieldFocus}
          onKeyDown={singleLineEnterBlur}
          onChange={(e) => dispatch({ type: 'setName', name: e.target.value })}
        />
        <Spacing size={16} />

        <button
          type="button"
          aria-label="트리거·입력 설정"
          onClick={() => setSheet('trigger')}
          style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
        >
          <Card testId="trigger-input-card">
            <ListRow
              contents={
                <ListRow.Texts type="Right2RowTypeA" top="트리거 · 입력" bottom={`${triggerLine} · ${inputSummary(draft.input)}`} />
              }
            />
          </Card>
        </button>
        {triggerError && (
          <>
            <Spacing size={4} />
            <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
              {triggerError}
            </Paragraph.Text>
          </>
        )}
        <Spacing size={12} />

        <button
          type="button"
          aria-label="AI 처리 설정"
          onClick={() => setSheet('ai')}
          style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
        >
          <Card testId="ai-step-card">
            <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="AI 처리" bottom={aiStepLine} />} />
          </Card>
        </button>
        {aiError && (
          <>
            <Spacing size={4} />
            <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
              {aiError}
            </Paragraph.Text>
          </>
        )}
        <Spacing size={12} />

        <button
          type="button"
          aria-label="액션 설정"
          onClick={() => setSheet('actions')}
          style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
        >
          <Card testId="actions-card">
            <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="액션" bottom={actionsLine} />} />
          </Card>
        </button>
        {actionsError && (
          <>
            <Spacing size={4} />
            <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
              {actionsError}
            </Paragraph.Text>
          </>
        )}
        <Spacing size={96} />
      </ScreenScaffold>

      <TriggerInputSheet
        open={sheet === 'trigger'}
        trigger={draft.trigger}
        input={draft.input}
        onDone={(trigger, input) => {
          dispatch({ type: 'setTrigger', trigger });
          dispatch({ type: 'setInput', input });
        }}
        onClose={() => setSheet(null)}
      />
      <AiStepSheet
        open={sheet === 'ai'}
        aiStep={draft.aiStep}
        onDone={(aiStep) => dispatch({ type: 'setAiStep', aiStep })}
        onClose={() => setSheet(null)}
      />
      <ActionListSheet
        open={sheet === 'actions'}
        actions={draft.actions}
        onAdd={() => dispatch({ type: 'addAction', action: { type: 'in_app' } })}
        onMove={(index, direction) => dispatch({ type: 'moveAction', index, direction })}
        onRemove={(index) => dispatch({ type: 'removeAction', index })}
        onClose={() => setSheet(null)}
      />

      {showLeaveConfirm && (
        <ConfirmDialog
          open
          title={<ConfirmDialog.Title>나가면 변경사항이 사라져요</ConfirmDialog.Title>}
          description={<ConfirmDialog.Description>지금까지 입력한 내용이 저장되지 않아요</ConfirmDialog.Description>}
          cancelButton={
            <ConfirmDialog.CancelButton onClick={() => setShowLeaveConfirm(false)}>닫기</ConfirmDialog.CancelButton>
          }
          confirmButton={<ConfirmDialog.ConfirmButton onClick={confirmLeave}>나가기</ConfirmDialog.ConfirmButton>}
          onClose={() => setShowLeaveConfirm(false)}
        />
      )}
    </>
  );
}
