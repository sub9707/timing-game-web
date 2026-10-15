import { test as base, expect, type Page } from '@playwright/test';

export const SETTINGS_KEY = 'timer-game:settings:v1';

/** 저장값 일부를 넣고 새로 시작 (나머지는 기본값) */
export async function seed(page: Page, settings: Record<string, unknown> = {}, extra: Record<string, string> = {}) {
  await page.goto('/');
  await page.evaluate(
    ([key, s, x]) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(s));
      for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v);
    },
    [SETTINGS_KEY, settings, extra] as const,
  );
  await page.reload();
  await expect(page.locator('.app.phase-idle')).toBeVisible();
}

/** 화면 오류가 나면 실패 */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
