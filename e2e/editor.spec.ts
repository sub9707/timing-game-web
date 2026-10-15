import { expect, seed, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '화면 편집', exact: true }).click();
  await expect(page.locator('.editor-layer')).toBeVisible();
});

test('요소 삽입 · 실행 취소 · 다시 실행', async ({ page }) => {
  await page.locator('.insert-btn', { hasText: '텍스트 상자' }).click();
  await expect(page.locator('.item-text')).toHaveCount(1);
  // 삽입하면 그 요소가 선택돼 속성 창이 열림 — 선택을 풀면 삽입 도구가 다시 보임
  await page.keyboard.press('Escape');
  await page.locator('.insert-btn', { hasText: '별' }).click();
  await expect(page.locator('.item')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.item')).toHaveCount(1);
  await page.keyboard.press('Control+y');
  await expect(page.locator('.item')).toHaveCount(2);
});

test('끌어서 옮기기', async ({ page }) => {
  await page.locator('.insert-btn', { hasText: '사각형' }).click();
  const item = page.locator('.item-shape');
  const a = (await item.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 100, a.y + a.height / 2 + 50, { steps: 6 });
  await page.mouse.up();
  const b = (await item.boundingBox())!;
  expect(b.x - a.x).toBeGreaterThan(60);
  expect(b.y - a.y).toBeGreaterThan(20);
});

test('복사·붙여넣기 · 그룹', async ({ page }) => {
  await page.locator('.insert-btn', { hasText: '원' }).click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(page.locator('.item')).toHaveCount(2);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+g');
  await expect(page.locator('.edit-group.is-grouped')).toBeVisible();
});

test('우클릭 메뉴와 줌', async ({ page }) => {
  await page.mouse.click(300, 300, { button: 'right' });
  await expect(page.locator('.edit-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+=');
  await expect(page.locator('.zoom-chip')).toHaveText('125%');
  await page.keyboard.press('Control+0');
  await expect(page.locator('.zoom-chip')).toHaveCount(0);
});
