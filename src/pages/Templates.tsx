import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Top, ListRow, Badge, Chip, ChipItem, Spacing, Asset, Paragraph } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { TEMPLATES } from '@/data/templates';
import type { FlowTemplate } from '@/lib/types';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { PlanAdSlot } from '@/components/PlanAdSlot';

type CategoryFilter = FlowTemplate['category'] | 'all';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: '전체',
  report: '리포트',
  alert: '알림',
  data: '데이터 정리',
};

const CATEGORIES: CategoryFilter[] = ['all', 'report', 'alert', 'data'];

// SDK는 WebView 밖에서 throw하므로 가드 필수 — 흰 화면 방지.
function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function Templates() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryFilter>('all');

  const filteredTemplates =
    category === 'all' ? TEMPLATES : TEMPLATES.filter((template) => template.category === category);

  function handleCategoryClick(next: CategoryFilter) {
    fireHaptic();
    flushSync(() => setCategory(next));
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>템플릿</Top.TitleParagraph>} />}>
      <Paragraph.Text typography="t6">검증된 자동화 레시피를 가져와요</Paragraph.Text>

      <Spacing size={12} />

      <Chip kind="select">
        {CATEGORIES.map((c) => (
          <ChipItem key={c} selected={category === c} onClick={() => handleCategoryClick(c)}>
            {CATEGORY_LABELS[c]}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={16} />

      <div data-testid="template-list">
        {filteredTemplates.map((template) => (
          <ListRow
            key={template.id}
            data-testid="template-row"
            left={
              <Asset.ContentIcon
                name="iconStarRegular"
                alt={template.title}
                style={{ width: 24, height: 24, flexShrink: 0 }}
              />
            }
            contents={<ListRow.Texts type="2RowTypeA" top={template.title} bottom={template.description} />}
            right={
              template.requiredFields.length > 0 ? (
                <Badge size="medium" variant="weak" color="blue">
                  설정 필요
                </Badge>
              ) : undefined
            }
            onClick={() => navigate(`/templates/${template.id}`)}
          />
        ))}
      </div>

      <Spacing size={16} />
      <PlanAdSlot />

      <Spacing size={32} />
      <Spacing size={32} />
    </ScreenScaffold>
  );
}
