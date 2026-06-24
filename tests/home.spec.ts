import { test, expect } from '@playwright/test';

test('homepage loads with the booking form', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/GP Autocare/i);

  // Booking form fields are present
  await expect(page.locator('#booking-form')).toBeVisible();
  await expect(page.locator('#bk-name')).toBeVisible();
  await expect(page.locator('#bk-email')).toBeVisible();
  await expect(page.locator('#bk-message')).toBeVisible();
});
