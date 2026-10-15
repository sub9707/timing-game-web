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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    base: './',
    plugins: [react(), adsTxt(env.VITE_ADSENSE_CLIENT)],
  };
});
