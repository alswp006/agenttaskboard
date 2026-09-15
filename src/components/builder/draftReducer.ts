import type { FlowDraft, Trigger, InputSource, AiStep, Action } from '@/lib/types';

export type DraftAction =
  | { type: 'setName'; name: string }
  | { type: 'setTrigger'; trigger: Trigger }
  | { type: 'setInput'; input: InputSource }
  | { type: 'setAiStep'; aiStep: AiStep }
  | { type: 'addAction'; action: Action }
  | { type: 'removeAction'; index: number }
  | { type: 'moveAction'; index: number; direction: 'up' | 'down' }
  | { type: 'updateAction'; index: number; action: Action };

export function draftReducer(draft: FlowDraft, action: DraftAction): FlowDraft {
  switch (action.type) {
    case 'setName':
      return { ...draft, name: action.name };

    case 'setTrigger':
      return { ...draft, trigger: action.trigger };

    case 'setInput':
      return { ...draft, input: action.input };

    case 'setAiStep':
      return { ...draft, aiStep: action.aiStep };

    case 'addAction': {
      if (draft.actions.length >= 3) return draft;
      return { ...draft, actions: [...draft.actions, action.action] };
    }

    case 'removeAction':
      return { ...draft, actions: draft.actions.filter((_, i) => i !== action.index) };

    case 'moveAction': {
      const targetIndex = action.direction === 'up' ? action.index - 1 : action.index + 1;
      if (targetIndex < 0 || targetIndex >= draft.actions.length) return draft;
      const actions = [...draft.actions];
      [actions[action.index], actions[targetIndex]] = [actions[targetIndex], actions[action.index]];
      return { ...draft, actions };
    }

    case 'updateAction':
      return {
        ...draft,
        actions: draft.actions.map((a, i) => (i === action.index ? action.action : a)),
      };

    default:
      return draft;
  }
}
