import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Toast } from '@toss/tds-mobile';

type ToastPosition = 'top' | 'bottom';

interface ToastItem {
  id: number;
  text: string;
  position: ToastPosition;
}

interface ToastContextValue {
  showToast: (text: string, position?: ToastPosition) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 2000;

// Routes 바깥에서 감싸 써야 navigate 후에도 Toast가 unmount되지 않는다.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const showToast = useCallback((text: string, position: ToastPosition = 'bottom') => {
    nextIdRef.current += 1;
    setQueue((prev) => [...prev, { id: nextIdRef.current, text, position }]);
  }, []);

  const current = queue[0] ?? null;

  // 한 번에 하나씩, 들어온 순서대로 — 앞 Toast가 사라진 뒤 다음 Toast가 뜬다.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <Toast open={current !== null} text={current?.text ?? ''} position={current?.position ?? 'bottom'} />
    </ToastCtx.Provider>
  );
}

export function useAppToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error('useAppToast는 ToastProvider 안에서만 사용할 수 있어요');
  }
  return ctx;
}

/** 계약(src/lib/contract.ts: useToastFn) 구현체 — 액션 컴포넌트가 이 이름으로 호출한다. */
export function useToast(): { show: (message: string, type?: 'success' | 'error' | 'info') => void } {
  const { showToast } = useAppToast();
  return {
    show: (message, type = 'info') => showToast(message, type === 'error' ? 'top' : 'bottom'),
  };
}
