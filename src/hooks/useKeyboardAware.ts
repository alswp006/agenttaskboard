import { useCallback, useEffect, useState } from 'react';

const SCROLL_DELAY_MS = 300;

interface UseKeyboardAwareResult {
  onFieldFocus: (e: React.FocusEvent<HTMLElement>) => void;
  footerOffset: number;
  singleLineEnterBlur: (e: React.KeyboardEvent<HTMLElement>) => void;
}

// 모바일 키보드 대응: 포커스된 입력을 화면 중앙으로 스크롤하고, 키보드가 밀어올린 만큼
// footerOffset으로 알려준다(SubmitFooter 래퍼 transform 전용 — 다른 용도로 쓰지 말 것).
export function useKeyboardAware(): UseKeyboardAwareResult {
  const [footerOffset, setFooterOffset] = useState(0);

  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!viewport) return;

    function handleResize() {
      try {
        setFooterOffset(Math.max(0, window.innerHeight - viewport!.height));
      } catch {
        setFooterOffset(0);
      }
    }

    handleResize();
    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  const onFieldFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
    const target = e.currentTarget;
    setTimeout(() => {
      try {
        target.scrollIntoView({ block: 'center' });
      } catch {
        /* jsdom/구형 브라우저 — 무시 */
      }
    }, SCROLL_DELAY_MS);
  }, []);

  const singleLineEnterBlur = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  return { onFieldFocus, footerOffset, singleLineEnterBlur };
}
