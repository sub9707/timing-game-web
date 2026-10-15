import { expect, seed, test } from './fixtures';

test('설정 탭 6개가 모두 열림', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '설정' }).click();
  for (const tab of ['게임', '연출', '텍스트', '디자인', '기록', '운영']) {
    await page.locator('.tabs button', { hasText: tab }).click();
    await expect(page.locator('.tabs button.is-on')).toHaveText(tab);
  }
});

test('화면 비율 고정', async ({ page }) => {
  await seed(page, { canvas: { aspect: '16:9' } });
  const box = await page.locator('.canvas').boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 2);
});

test('PIN 잠금', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '설정' }).click();
  await page.locator('.tabs button', { hasText: '운영' }).click();
  await page.getByPlaceholder('PIN (숫자 4~8자리)').fill('1234');
  await page.getByPlaceholder('한 번 더').fill('1234');
  await page.getByRole('button', { name: 'PIN 정하고 잠그기' }).click();
  await page.getByRole('button', { name: '완료' }).click();
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.locator('.pin-dialog')).toBeVisible();
  await page.locator('.pin-input').fill('0000');
  await page.keyboard.press('Enter');
  await expect(page.locator('.pin-error')).toBeVisible();
  await page.locator('.pin-input').fill('1234');
  await page.keyboard.press('Enter');
  await expect(page.locator('.panel.is-open')).toBeVisible();
});

test('영어 화면', async ({ page }) => {
  await seed(page, {}, { 'timer-game:lang': 'en' });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.tabs button', { hasText: 'Effects' })).toBeVisible();
  for (const tab of ['Game', 'Effects', 'Text', 'Design', 'Records', 'Operate']) {
    await page.locator('.tabs button', { hasText: tab }).click();
    // 언어 전환('언어 · Language' · '한국어') 말고는 한글이 없어야 함
    const text = await page.locator('.panel').evaluate((el) => el.textContent!.replace('언어 · Language', '').replace('한국어', ''));
    expect(text).not.toMatch(/[가-힣]/);
  }
});
