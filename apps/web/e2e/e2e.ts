import { test, expect } from '@playwright/test';

test.describe('E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });

  test('full user journey', async ({ page }) => {
    await page.click('text=Phone');
    await expect(page).toHaveURL(/.*category=phone/);

    await page.locator('h3').first().click();
    await expect(page).toHaveURL(/.*product\/.*/);

    await page.click('text=MUA NGAY');
    await expect(page).toHaveURL(/.*cart/);

    await page.click('text=Tiến hành đặt hàng');
    await expect(page).toHaveURL(/.*checkout/);

    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="phone"]', '0123456789');
    await page.fill('input[id="city"]', 'Hồ Chí Minh');
    await page.fill('input[id="address"]', '123 Test St');

    await page.click('text=XÁC NHẬN');

    await expect(page.locator('text=Đặt hàng thành công!')).toBeVisible();
  });

  test('language toggle', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Chào mừng' })).toBeVisible();

    await page.click('text=EN');
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible();

    await page.click('text=VN');
    await expect(page.locator('h1', { hasText: 'Chào mừng' })).toBeVisible();
  });

  test('responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('header').getByRole('link', { name: 'Giỏ hàng' })).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('header').getByRole('link', { name: 'Giỏ hàng' })).not.toBeVisible();
  });
});
