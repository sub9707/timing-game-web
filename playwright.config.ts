import { defineConfig } from '@playwright/test';

// e2e — 설치된 Chrome 으로 실행 (브라우저 따로 내려받지 않음): npm run test:e2e
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // 게임 타이밍을 재는 테스트라 동시에 너무 많이 돌리지 않음
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4801/',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
  },
  webServer: {
    command: 'npx vite --port 4801 --strictPort',
    url: 'http://localhost:4801/',
    reuseExistingServer: !process.env.CI,
  },
});
