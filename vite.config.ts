import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** 애드센스 ads.txt — .env 의 게시자 ID 로 빌드 때 만듦 (없으면 만들지 않음) */
function adsTxt(client: string | undefined): Plugin {
  return {
    name: 'ads-txt',
    generateBundle() {
      const pub = client?.replace(/^ca-/, '').trim();
      if (!pub) return;
      this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` });
    },
  };
}

/** 오프라인용 — 빌드된 파일 목록을 서비스 워커가 설치 때 모두 받아 둠 */
function precacheList(): Plugin {
  return {
    name: 'precache-list',
    generateBundle(_, bundle) {
      const files = ['./', 'index.html', 'privacy.html', 'terms.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', ...Object.keys(bundle)];
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify([...new Set(files)]) });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    base: './',
    plugins: [react(), adsTxt(env.VITE_ADSENSE_CLIENT), precacheList()],
  };
});
