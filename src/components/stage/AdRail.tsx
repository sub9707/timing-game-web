import { memo, useEffect, useRef, useSyncExternalStore } from 'react';
import { tr } from '../../i18n';

/* 구글 애드센스 설정 — .env 에 넣으면 적용 (.env.example 참고)
   비어 있으면 광고 영역을 만들지 않음 (개발 서버에서만 자리 표시) */
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? '';
const SLOTS = {
  left: import.meta.env.VITE_ADSENSE_SLOT_LEFT ?? '',
  right: import.meta.env.VITE_ADSENSE_SLOT_RIGHT ?? '',
};

/** 세로 배너 (와이드 스카이스크래퍼) */
export const AD_W = 160;
export const AD_H = 600;

/** 광고를 띄울 만큼 화면이 넓고 높을 때만 — 콘텐츠를 좁히지 않도록.
 *  브라우저 전체화면(F11)일 때도 숨김 */
const WIDE_QUERY = `(min-width: 1200px) and (min-height: ${AD_H + 140}px) and (not (display-mode: fullscreen))`;

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function useAdsVisible() {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_QUERY).matches);
  return wide && (!!CLIENT || import.meta.env.DEV);
}

/* ───── 광고 쿠키 동의 — 고르기 전엔 광고를 부르지 않음, 거부하면 맞춤이 아닌 광고 ───── */
const CONSENT_KEY = 'timer-game:ad-consent';
export type Consent = 'granted' | 'denied' | null;
let consent: Consent = (() => {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
})();
const consentListeners = new Set<() => void>();
export function setConsent(v: 'granted' | 'denied') {
  consent = v;
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* storage unavailable */
  }
  consentListeners.forEach((l) => l());
}
const subscribeConsent = (l: () => void) => {
  consentListeners.add(l);
  return () => {
    consentListeners.delete(l);
  };
};
export const useConsent = () => useSyncExternalStore(subscribeConsent, () => consent);
/** 광고를 쓰는 배포인지 (동의 안내를 띄울지) */
export const adsConfigured = !!CLIENT;

let scriptLoaded = false;
function loadAdsense() {
  if (scriptLoaded || !CLIENT || !consent) return;
  scriptLoaded = true;
  // 거부했으면 맞춤이 아닌 광고 요청
  if (consent === 'denied') (window as unknown as { adsbygoogle?: { requestNonPersonalizedAds?: number } }).adsbygoogle = Object.assign([], { requestNonPersonalizedAds: 1 });
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

type AdsQueue = { push: (v: object) => void };

function AdSlot({ slot }: { slot: string }) {
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
      style={{ display: 'inline-block', width: AD_W, height: AD_H }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
    />
  );
}

/** 화면 양옆 광고 영역 — 앱 배경 위에 은은한 유리판으로 얹음 (동의 안내에 답한 뒤에만 광고 요청) */
export const AdRail = memo(function AdRail({ side }: { side: 'left' | 'right' }) {
  const slot = SLOTS[side];
  const c = useConsent();
  return (
    <aside className={`ad-rail is-${side}`} aria-label={tr('광고')}>
      <span className="ad-label">AD</span>
      <div className="ad-box">{CLIENT && slot && c ? <AdSlot slot={slot} /> : <span className="ad-placeholder">{`${AD_W} × ${AD_H}`}</span>}</div>
    </aside>
  );
});

/** 광고 쿠키 동의 안내 (광고를 쓰는 배포에서 아직 고르지 않았을 때만) */
export function ConsentBanner() {
  const c = useConsent();
  if (!adsConfigured || c) return null;
  return (
    <div className="consent" role="dialog" aria-label={tr('쿠키 동의')}>
      <p>
        {tr('이 사이트는 운영비를 위해 Google 광고를 보여주며, 광고에 쿠키를 쓸 수 있어요.')}{' '}
        <a href="privacy.html" target="_blank" rel="noreferrer">
          {tr('개인정보처리방침')}
        </a>
      </p>
      <div className="consent-actions">
        <button className="ghost-btn" onClick={() => setConsent('denied')}>
          {tr('맞춤 광고 거부')}
        </button>
        <button className="primary-btn" onClick={() => setConsent('granted')}>
          {tr('동의')}
        </button>
      </div>
    </div>
  );
}
