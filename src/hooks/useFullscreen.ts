import { useEffect, useState } from 'react';

const FS_QUERY = '(display-mode: fullscreen)';

/** 앱 전체화면을 쓸 수 있는지 (아이폰 사파리는 안 됨) */
const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled;

/** 전체화면 상태 — app: 앱 버튼(Fullscreen API) · any: 브라우저 F11 포함 */
export function useFullscreen() {
  const [app, setApp] = useState(false);
  const [display, setDisplay] = useState(() => matchMedia(FS_QUERY).matches);

  useEffect(() => {
    const onChange = () => setApp(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    const mq = matchMedia(FS_QUERY);
    const onMq = () => setDisplay(mq.matches);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => undefined);
  };

  return { app, any: app || display, toggle, supported };
}
