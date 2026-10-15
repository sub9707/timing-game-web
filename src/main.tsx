import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/orbitron';
import '@fontsource-variable/cinzel';
import '@fontsource/jua';
import '@fontsource/press-start-2p';
import '@fontsource/bebas-neue';
import '@fontsource/black-han-sans';
import '@fontsource/do-hyeon';

import './styles/base.css';
import './styles/stage.css';
import './styles/themes.css';
import './styles/blind.css';
import './styles/dramatic.css';
import './styles/panel.css';

import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { isOutputWindow } from './live/sync';
import OutputApp from './OutputApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{isOutputWindow ? <OutputApp /> : <App />}</ErrorBoundary>
  </StrictMode>,
);

// 오프라인 실행 (앱 설치·행사장 인터넷 끊김 대비) — 배포 빌드에서만
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => undefined);
  });
}
