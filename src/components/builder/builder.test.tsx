import { useReducer } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockAll } from '@/__tests__/__helpers__/mocks';
import type { Action, AiStep, FlowDraft, InputSource, Trigger } from '@/lib/types';
import { draftReducer } from '@/components/builder/draftReducer';
import { TriggerInputSheet } from '@/components/builder/TriggerInputSheet';
import { AiStepSheet } from '@/components/builder/AiStepSheet';
import { ActionListSheet } from '@/components/builder/ActionListSheet';

mockAll();

function makeDraft(overrides: Partial<FlowDraft> = {}): FlowDraft {
  return {
    name: '테스트 플로우',
    input: { type: 'text', text: '' } as InputSource,
    trigger: { type: 'manual' } as Trigger,
    aiStep: { task: 'summarize', instruction: '', targetLanguage: null } as AiStep,
    actions: [{ type: 'in_app' }] as Action[],
    ...overrides,
  };
}

describe('draftReducer', () => {
  it('moveAction swaps adjacent actions', () => {
    const draft = makeDraft({ actions: [{ type: 'in_app' }, { type: 'slack_webhook', webhookUrl: '' }] });
    const next = draftReducer(draft, { type: 'moveAction', index: 1, direction: 'up' });
    expect(next.actions[0].type).toBe('slack_webhook');
    expect(next.actions[1].type).toBe('in_app');
  });

  it('addAction is a no-op once actions reach 3', () => {
    const draft = makeDraft({
      actions: [{ type: 'in_app' }, { type: 'slack_webhook', webhookUrl: '' }, { type: 'google_sheet_append', sheetUrl: '', sheetName: '' }],
    });
    const next = draftReducer(draft, { type: 'addAction', action: { type: 'in_app' } });
    expect(next.actions).toHaveLength(3);
  });
});

// ActionListSheet를 실제 reducer에 연결해 AC-1·AC-2를 화면 단위로 재확인한다.
describe('ActionListSheet + draftReducer 연동', () => {
  function Harness({ initialActions }: { initialActions: Action[] }) {
    const [draft, dispatch] = useReducer(draftReducer, makeDraft({ actions: initialActions }));
    return (
      <ActionListSheet
        open
        actions={draft.actions}
        onAdd={() => dispatch({ type: 'addAction', action: { type: 'in_app' } })}
        onMove={(index, direction) => dispatch({ type: 'moveAction', index, direction })}
        onRemove={(index) => dispatch({ type: 'removeAction', index })}
        onClose={() => {}}
      />
    );
  }

  it('AC-1: 3개면 액션 추가가 disabled다', () => {
    render(
      <Harness
        initialActions={[{ type: 'in_app' }, { type: 'slack_webhook', webhookUrl: '' }, { type: 'google_sheet_append', sheetUrl: '', sheetName: '' }]}
      />,
    );
    expect(screen.getByRole('button', { name: '액션 추가' })).toBeDisabled();
  });

  it('AC-2: 두 번째 액션의 위로를 탭하면 순서가 실제로 바뀐다', () => {
    render(<Harness initialActions={[{ type: 'in_app' }, { type: 'slack_webhook', webhookUrl: '' }]} />);
    fireEvent.click(screen.getAllByRole('button', { name: '위로' })[1]);
    const rows = screen.getAllByText(/인앱 알림|슬랙 웹훅/);
    expect(rows[0]).toHaveTextContent('슬랙 웹훅');
    expect(rows[1]).toHaveTextContent('인앱 알림');
  });
});

describe('AiStepSheet', () => {
  it('AC-3: task가 translate이고 targetLanguage가 null이면 완료가 disabled다', () => {
    render(
      <AiStepSheet
        open
        aiStep={{ task: 'translate', instruction: '', targetLanguage: null }}
        onDone={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled();
  });

  it('언어를 고르면 완료가 활성화된다', () => {
    render(
      <AiStepSheet
        open
        aiStep={{ task: 'translate', instruction: '', targetLanguage: null }}
        onDone={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '영어' }));
    expect(screen.getByRole('button', { name: '완료' })).not.toBeDisabled();
  });

  it('classify는 지시문이 없으면 완료가 disabled고 안내 문구가 보인다', () => {
    render(
      <AiStepSheet open aiStep={{ task: 'classify', instruction: '', targetLanguage: null }} onDone={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled();
    expect(screen.getByText('분류 기준을 입력해주세요')).toBeInTheDocument();
  });
});

describe('TriggerInputSheet', () => {
  it('수동/매일/매주 트리거 옵션을 보여준다', () => {
    render(
      <TriggerInputSheet
        open
        trigger={{ type: 'manual' }}
        input={{ type: 'text', text: '' }}
        onDone={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '수동 실행' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '매일' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '매주' })).toBeInTheDocument();
  });

  it('매주 트리거일 때만 요일 칩이 보인다', () => {
    render(
      <TriggerInputSheet
        open
        trigger={{ type: 'weekly', days: ['mon'], time: '09:00' }}
        input={{ type: 'text', text: '' }}
        onDone={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '월' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일' })).toBeInTheDocument();
  });

  it('요일을 모두 해제하면 완료가 disabled다', () => {
    render(
      <TriggerInputSheet
        open
        trigger={{ type: 'weekly', days: ['mon'], time: '09:00' }}
        input={{ type: 'text', text: '내용' }}
        onDone={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '월' }));
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled();
  });

  it('완료를 탭하면 onDone이 최신 trigger·input으로 호출된다', () => {
    let received: unknown = null;
    render(
      <TriggerInputSheet
        open
        trigger={{ type: 'manual' }}
        input={{ type: 'text', text: '내용' }}
        onDone={(trigger, input) => {
          received = { trigger, input };
        }}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    expect(received).toEqual({ trigger: { type: 'manual' }, input: { type: 'text', text: '내용' } });
  });
});

describe('탈-AI 카피 규칙', () => {
  it('고급 연동·커뮤니티 문구를 쓰지 않는다', () => {
    const { container } = render(
      <>
        <TriggerInputSheet
          open
          trigger={{ type: 'weekly', days: ['mon'], time: '09:00' }}
          input={{ type: 'google_sheet', sheetUrl: '', range: 'A1:D50' }}
          onDone={() => {}}
          onClose={() => {}}
        />
        <AiStepSheet open aiStep={{ task: 'translate', instruction: '', targetLanguage: 'en' }} onDone={() => {}} onClose={() => {}} />
        <ActionListSheet open actions={[{ type: 'in_app' }]} onAdd={() => {}} onMove={() => {}} onRemove={() => {}} onClose={() => {}} />
      </>,
    );
    expect(container.textContent).not.toMatch(/고급 연동|커뮤니티/);
  });
});
