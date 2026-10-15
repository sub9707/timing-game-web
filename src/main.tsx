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

// 예전에 등록된 서비스 워커(앱 설치·오프라인) 정리 — 항상 최신 사이트를 받도록
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => void r.unregister()))
    .catch(() => undefined);
}
