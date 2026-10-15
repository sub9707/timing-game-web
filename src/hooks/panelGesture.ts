// 패널 안 컨트롤(색 선택기·슬라이더)을 끄는 중인지 — 그동안 패널 전체는 다시 그리지 않음
import { useSyncExternalStore } from 'react';

let active = false;
const listeners = new Set<() => void>();

export function setPanelGesture(v: boolean) {
  if (active === v) return;
  active = v;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const usePanelGesture = () => useSyncExternalStore(subscribe, () => active);
