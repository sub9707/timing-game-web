import { expect, seed, test } from './fixtures';

test('시작 → 정지 → 결과 → 리셋', async ({ page }) => {
  await seed(page);
  await page.keyboard.press('Space');
  await expect(page.locator('.app.phase-running')).toBeVisible();
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await expect(page.locator('.app.phase-result')).toBeVisible();
  await expect(page.locator('.result-label')).toHaveText(/FAIL/);
  await page.waitForTimeout(900);
  await page.keyboard.press('Space');
  await expect(page.locator('.app.phase-idle')).toBeVisible();
});

test('허용 오차 안이면 성공 + 기록과 랭킹', async ({ page }) => {
  await seed(page, { targetMs: 1000, strictJudge: false, toleranceMode: 'ms', toleranceBelowMs: 5000, toleranceAboveMs: 5000 });
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await page.keyboard.press('Space');
  await expect(page.locator('.result-label')).toHaveText(/SUCCESS/);
  await page.waitForTimeout(900);
  await page.keyboard.press('Space');
  await page.keyboard.press('l');
  await expect(page.locator('.board-row')).toHaveCount(1);
  await page.keyboard.press('l');
  await expect(page.locator('.board')).toHaveCount(0);
});

test('카운트다운 뒤 시작', async ({ page }) => {
  await seed(page, { round: { countdown: true, countdownSec: 2 } });
  await page.keyboard.press('Space');
  await expect(page.locator('.app.phase-countdown')).toBeVisible();
  await expect(page.locator('.countdown span')).toHaveText('2');
  await expect(page.locator('.app.phase-running')).toBeVisible({ timeout: 4000 });
});

test('결과 후 자동으로 다음 라운드', async ({ page }) => {
  await seed(page, { round: { autoResetMs: 800 } });
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  await expect(page.locator('.app.phase-result')).toBeVisible();
  await expect(page.locator('.app.phase-idle')).toBeVisible({ timeout: 4000 });
});

test('시간 표시 형식', async ({ page }) => {
  await seed(page, { timeFormat: 'ss.ccc', targetMs: 15000 });
  await expect(page.locator('.target-digits')).toHaveText('15.000');
});

test('화면 탭으로 시작', async ({ page }) => {
  await seed(page, { input: { tap: true } });
  await page.mouse.click(700, 600);
  await expect(page.locator('.app.phase-running')).toBeVisible();
});
