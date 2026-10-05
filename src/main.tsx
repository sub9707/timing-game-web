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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
