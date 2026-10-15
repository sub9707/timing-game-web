import { memo, useEffect, useRef, useSyncExternalStore } from 'react';
import { tr } from '../../i18n';

/* 구글 애드센스 설정 — .env 에 넣으면 적용 (.env.example 참고)
   비어 있으면 광고 영역을 만들지 않음 (개발 서버에서만 자리 표시) */
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? '';
const SLOTS = {
  left: import.meta.env.VITE_ADSENSE_SLOT_LEFT ?? '',
  right: import.meta.env.VITE_ADSENSE_SLOT_RIGHT ?? '',
};

/** 세로 배너 — 보통은 와이드 스카이스크래퍼(160), 아주 넓은 화면에선 하프 페이지(300) · 같은 광고 단위를 크기만 바꿔 씀 */
const AD_W = 160;
const AD_W_WIDE = 300;
const AD_H = 600;

/** 광고를 띄울 만큼 화면이 넓고 높을 때만 — 콘텐츠를 좁히지 않도록.
 *  브라우저 전체화면(F11)일 때도 숨김 */
const WIDE_QUERY = `(min-width: 1200px) and (min-height: ${AD_H + 140}px) and (not (display-mode: fullscreen))`;

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/** 하프 페이지를 넣어도 무대가 충분히 넓은 화면 (stage.css 의 .has-ads 여백과 같은 기준) */
const HALF_PAGE_QUERY = '(min-width: 1800px)';
const subscribeHalf = (cb: () => void) => {
  const mq = window.matchMedia(HALF_PAGE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useAdWidth = () => (useSyncExternalStore(subscribeHalf, () => window.matchMedia(HALF_PAGE_QUERY).matches) ? AD_W_WIDE : AD_W);

export function useAdsVisible() {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_QUERY).matches);
  // 광고 단위(슬롯)까지 넣어야 배포 화면에 자리가 생김 — 게시자 ID만 있을 땐(심사 중) 빈 칸을 보이지 않음
  return wide && ((!!CLIENT && !!(SLOTS.left || SLOTS.right)) || import.meta.env.DEV);
}

/* 동의는 애드센스의 개인 정보 보호 메시지(구글 인증 CMP)가 맡음 — 유럽·영국 방문자에게만 자동으로 물어봄 */
let scriptLoaded = false;
function loadAdsense() {
  if (scriptLoaded || !CLIENT) return;
  scriptLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

type AdsQueue = { push: (v: object) => void };

function AdSlot({ slot, width }: { slot: string; width: number }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    loadAdsense();
    const el = ref.current;
    // StrictMode 이중 실행·재마운트 때 같은 칸에 두 번 요청하지 않도록
    if (!el || el.dataset.requested) return;
    el.dataset.requested = '1';
    try {
      const w = window as unknown as { adsbygoogle?: AdsQueue };
      (w.adsbygoogle = w.adsbygoogle ?? ([] as unknown as AdsQueue)).push({});
    } catch {
      /* 광고 차단 등 */
    }
  }, []);

  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: 'inline-block', width, height: AD_H }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
    />
  );
}

/** 화면 양옆 광고 영역 — 앱 배경 위에 은은한 유리판으로 얹음 */
export const AdRail = memo(function AdRail({ side }: { side: 'left' | 'right' }) {
  const slot = SLOTS[side];
  const width = useAdWidth();
  return (
    <aside className={`ad-rail is-${side}`} aria-label={tr('광고')}>
      <span className="ad-label">AD</span>
      <div className="ad-box">{CLIENT && slot ? <AdSlot key={width} slot={slot} width={width} /> : <span className="ad-placeholder">{`${width} × ${AD_H}`}</span>}</div>
    </aside>
  );
});
