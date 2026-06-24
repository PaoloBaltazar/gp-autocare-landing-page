import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Live deployed site. Override with SITE_URL to point at a different deployment.
const SITE_URL =
  process.env.SITE_URL || 'https://gp-autocare-landing-page.vercel.app';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

test('contact form submits and persists to Supabase', async ({ page }) => {
  // Unique email so repeat runs never collide on a duplicate address.
  const timestamp = Date.now();
  const name = 'Playwright Test User';
  const email = `playwright-test+${timestamp}@example.com`;
  const message = 'This is an automated test submission';

  await test.step('Open the live site and scroll to the contact form', async () => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#booking-form').scrollIntoViewIfNeeded();
    await expect(page.locator('#booking-form')).toBeVisible();
  });

  await test.step('Fill and submit the form', async () => {
    await page.fill('#bk-name', name);
    await page.fill('#bk-email', email);
    await page.fill('#bk-message', message);
    await page.click('#booking-form button[type="submit"]');
  });

  await test.step('Success message appears within 5 seconds', async () => {
    await expect(page.locator('#booking-ok')).toBeVisible({ timeout: 5000 });
    console.log(`✓ Form submitted — success message shown for ${email}`);
  });

  await test.step('Row was actually created in Supabase', async () => {
    expect(
      SUPABASE_URL && SUPABASE_ANON_KEY,
      'SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env'
    ).toBeTruthy();

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    // The insert + confirmation email happen server-side; give it a brief window.
    let row: Record<string, unknown> | null = null;
    await expect
      .poll(
        async () => {
          const { data, error } = await supabase
            .from('signups')
            .select('id, name, email, message, created_at')
            .eq('email', email)
            .maybeSingle();
          if (error) throw error;
          row = data;
          return data ? 'found' : 'missing';
        },
        { timeout: 10000, intervals: [500, 1000, 2000] }
      )
      .toBe('found');

    expect(row, 'no signups row found for the submitted email').not.toBeNull();
    expect(row!).toMatchObject({ name, email, message });
    console.log(`✓ Supabase row verified — id=${row!.id}`);
  });
});
