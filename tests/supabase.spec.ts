import { test, expect, request } from '@playwright/test';

// These come from .env, loaded via `import 'dotenv/config'` in playwright.config.ts
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

test('Supabase env vars are configured', () => {
  expect(SUPABASE_URL, 'SUPABASE_URL must be set in .env').toBeTruthy();
  expect(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY must be set in .env').toBeTruthy();
});

test('signups table is reachable with the anon key', async () => {
  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'Supabase env vars not set');

  const ctx = await request.newContext();
  const res = await ctx.get(`${SUPABASE_URL}/rest/v1/signups?select=count`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  // The signups table (created by the migration) responds 200 over PostgREST.
  expect(res.ok()).toBeTruthy();
  await ctx.dispose();
});
