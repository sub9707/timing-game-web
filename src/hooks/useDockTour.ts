import { useState } from 'react';
import { track } from '../analytics';

/** 아래 메뉴 안내 단계 (버튼 순서대로 · 정보 버튼은 빼고) */
export type TourStep = 'board' | 'lang' | 'fullscreen' | 'edit' | 'settings' | 'toggle';

const LAST_VISIT_KEY = 'timer-game:last-visit';
/** 오랜만에 오면 다시 안내 */
const RETURN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** 처음 왔거나 마지막 방문이 오래됐는지 — 페이지를 열 때 한 번만 확인하고 방문 시각을 새로 남김 */
let atStart: boolean | null = null;
function shouldShowAtStart() {
  if (atStart !== null) return atStart;
  try {
    const last = Number(localStorage.getItem(LAST_VISIT_KEY)) || 0;
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    atStart = !last || Date.now() - last > RETURN_AFTER_MS;
  } catch {
    atStart = false;
  }
  return atStart;
}

/**
 * 아래 메뉴 안내 — 말풍선을 이전·다음으로 하나씩 넘김
 * steps: 지금 보이는 버튼만 (잠금·전체화면에 따라 달라짐) · enabled 가 꺼진 동안엔 잠시 숨김
 */
export function useDockTour(steps: TourStep[], enabled: boolean) {
  const [open, setOpen] = useState(shouldShowAtStart);
  const [index, setIndex] = useState(0);
  const i = Math.min(index, steps.length - 1);

  const finish = (how: 'done' | 'skip') => {
    setOpen(false);
    track(`tour_${how}`, { step: i + 1 });
  };

  return {
    step: open && enabled ? steps[i] : null,
    index: i,
    total: steps.length,
    next: () => (i + 1 >= steps.length ? finish('done') : setIndex(i + 1)),
    prev: () => setIndex(Math.max(0, i - 1)),
    close: () => finish('skip'),
    /** 안내 없이 끝냄 (설정을 직접 열었을 때) */
    end: () => setOpen(false),
  };
}

export type DockTour = ReturnType<typeof useDockTour>;
