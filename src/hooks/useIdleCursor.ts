import { useEffect } from 'react';

/** 켜져 있으면 마우스를 잠깐 안 움직일 때 커서를 숨김 (전체화면 송출용) */
export function useIdleCursor(active: boolean, delayMs = 2500) {
  useEffect(() => {
    if (!active) return;
    let t = 0;
    const show = () => {
      document.body.classList.remove('is-cursor-hidden');
      clearTimeout(t);
      t = window.setTimeout(() => document.body.classList.add('is-cursor-hidden'), delayMs);
    };
    show();
    window.addEventListener('pointermove', show);
    window.addEventListener('pointerdown', show);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerdown', show);
      document.body.classList.remove('is-cursor-hidden');
    };
  }, [active, delayMs]);
}
