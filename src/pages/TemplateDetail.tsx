import { useNavigate, useParams } from 'react-router-dom';
import { Top, ListRow, Button, Paragraph, Spacing, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useAppState } from '@/hooks/AppStateContext';
import { useAppToast } from '@/hooks/ToastProvider';
import { TEMPLATES } from '@/data/templates';
import { format } from '@/lib/format';
import type { Action, InputSource, RouteState } from '@/lib/types';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';

const FLOW_LIMIT = 50;

function describeInput(input: InputSource): string {
  if (input.type === 'text') return '텍스트 입력';
  if (input.type === 'news_keyword') return `키워드 "${input.keyword}"`;
  return `구글시트 · ${input.range}`;
}

function inputUrl(input: InputSource): string | null {
  return input.type === 'google_sheet' ? input.sheetUrl : null;
}

function actionUrl(action: Action): string | null {
  if (action.type === 'slack_webhook') return action.webhookUrl;
  if (action.type === 'google_sheet_append') return action.sheetUrl;
  return null;
}

// SDK는 WebView 밖에서 throw하므로 가드 필수 — 흰 화면 방지.
function fireHaptic(type: 'success' | 'error') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function TemplateDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { flows } = useAppState();
  const { showToast } = useAppToast();

  const template = TEMPLATES.find((t) => t.id === templateId) ?? null;

  if (!template) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>템플릿</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconStarRegular" alt="템플릿 없음" />}
          title="템플릿을 찾을 수 없어요"
          description="삭제되었거나 잘못된 경로예요"
          action={
            <Button variant="weak" onClick={() => navigate('/templates')}>
              템플릿 목록으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const [triggerLine, aiStepLine, actionsLine] = format(template.draft).split(' · ');
  const notice =
    template.requiredFields.length > 0
      ? `가져온 뒤 채워야 할 항목이 ${template.requiredFields.length}개 있어요`
      : null;
  const sheetUrl = inputUrl(template.draft.input);

  function handleUseTemplate() {
    if (flows.length >= FLOW_LIMIT) {
      fireHaptic('error');
      showToast(`플로우는 최대 ${FLOW_LIMIT}개까지 만들 수 있어요`, 'top');
      return;
    }
    const { draft, id, requiredFields } = template!;
    navigate('/flows/new', {
      state: {
        draft,
        source: 'template',
        templateId: id,
        missingFields: requiredFields,
      } as RouteState['/flows/new'],
    });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{template.title}</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="이 템플릿 사용하기" onClick={handleUseTemplate} />}
    >
      <Paragraph.Text typography="t6">{template.description}</Paragraph.Text>
      <Spacing size={16} />

      <Card testId="template-summary-card">
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="트리거" bottom={triggerLine} />} />
        <ListRow
          contents={
            <ListRow.Texts
              type="Right2RowTypeA"
              top="입력 · AI 처리"
              bottom={`${describeInput(template.draft.input)} · ${aiStepLine}`}
            />
          }
        />
        <ListRow contents={<ListRow.Texts type="Right2RowTypeA" top="액션" bottom={actionsLine} />} />
        {sheetUrl ? <Paragraph.Text typography="st13">{sheetUrl}</Paragraph.Text> : null}
        {template.draft.actions.map((action, idx) => {
          const url = actionUrl(action);
          return url ? (
            <Paragraph.Text key={idx} typography="st13">
              {url}
            </Paragraph.Text>
          ) : null;
        })}
      </Card>

      {notice ? (
        <>
          <Spacing size={12} />
          <Paragraph.Text typography="st13">{notice}</Paragraph.Text>
        </>
      ) : null}

      <Spacing size={80} />
    </ScreenScaffold>
  );
}
