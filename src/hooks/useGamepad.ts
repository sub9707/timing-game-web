import { useEffect, useRef } from 'react';

export type PadAction = 'action' | 'reset' | 'cheat';

/** 게임패드 — A(0)·RB(5)·RT(7) = 시작·정지, B(1) = 리셋, Y(3) = 치트. 눌린 순간만 */
const MAP: Record<number, PadAction> = { 0: 'action', 5: 'action', 7: 'action', 1: 'reset', 3: 'cheat' };

export function useGamepad(enabled: boolean, onPress: (kind: PadAction, t: number) => void) {
  const cb = useRef(onPress);
  cb.current = onPress;
  useEffect(() => {
    if (!enabled || !('getGamepads' in navigator)) return;
    let raf = 0;
    const prev = new Map<string, boolean>();
    const poll = () => {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        pad.buttons.forEach((b, i) => {
          const key = `${pad.index}:${i}`;
          const was = prev.get(key) ?? false;
          if (b.pressed && !was && MAP[i]) cb.current(MAP[i], performance.now());
          prev.set(key, b.pressed);
        });
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
}
