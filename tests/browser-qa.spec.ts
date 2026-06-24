import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Live deployed site. Override with SITE_URL to point at a different deployment.
const SITE_URL =
  process.env.SITE_URL || 'https://gp-autocare-landing-page.vercel.app';

const SCREENSHOT_DIR = path.join('tests', 'screenshots');
const REPORT_PATH = path.join('tests', 'qa-report.md');

// Strings that, if found in the page body, signal a broken page.
const ERROR_MARKERS = [
  'Application error',
  'This page could not be found',
  '404: NOT_FOUND',
  'DEPLOYMENT_NOT_FOUND',
  'Internal Server Error',
];

type Row = {
  name: string;
  url: string;
  status: number | string;
  hasNav: boolean;
  hasFooter: boolean;
  screenshot: string;
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page'
  );
}

// Visit a URL, capture status, error-text check, nav/footer presence, screenshot.
async function inspectPage(page: Page, name: string, url: string): Promise<Row> {
  const slug = slugify(name);
  const screenshot = path.join(SCREENSHOT_DIR, `${slug}.png`);

  const response = await page.goto(url, { waitUntil: 'load' });
  const status = response ? response.status() : 'no-response';

  const body = (await page.locator('body').innerText()).slice(0, 5000);
  const errorHit = ERROR_MARKERS.find((m) => body.includes(m));

  const hasNav = (await page.locator('nav, header').count()) > 0;
  const hasFooter = (await page.locator('footer').count()) > 0;

  await page.screenshot({ path: screenshot, fullPage: true });

  // Page is healthy if it returned 200 and shows no error marker.
  expect(status, `${url} should return HTTP 200`).toBe(200);
  expect(errorHit, `${url} shows error text: ${errorHit}`).toBeUndefined();

  return { name, url, status, hasNav, hasFooter, screenshot };
}

test('crawl internal links, screenshot each page, and report', async ({ page }) => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const rows: Row[] = [];

  // 1 + 2: Open the live landing page and screenshot it.
  rows.push(await inspectPage(page, 'Home', SITE_URL));

  // 3: Collect every link in the nav and footer.
  const origin = new URL(SITE_URL).origin;
  const homeDoc = new URL(SITE_URL);
  homeDoc.hash = '';

  const anchors = await page.locator('nav a, header a, footer a').evaluateAll(
    (els) =>
      (els as HTMLAnchorElement[]).map((a) => ({
        href: a.href, // already resolved to absolute by the browser
        text: (a.textContent || '').trim(),
      }))
  );

  // 4: Keep only internal page links — same origin, real navigations.
  // Skip mailto:/tel:/javascript:, external hosts, and pure same-page anchors.
  const seen = new Set<string>([homeDoc.href]);
  const internal: { name: string; url: string }[] = [];

  for (const a of anchors) {
    let parsed: URL;
    try {
      parsed = new URL(a.href);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) continue; // mailto/tel/etc.
    if (parsed.origin !== origin) continue; // external (social, etc.)

    const doc = new URL(parsed.href);
    doc.hash = ''; // strip in-page anchor to get the document URL
    if (seen.has(doc.href)) continue; // dedupe + skip same-page anchors
    seen.add(doc.href);

    const name = a.text || doc.pathname.replace(/^\//, '') || doc.href;
    internal.push({ name, url: doc.href });
  }

  console.log(
    `Found ${internal.length} unique internal page link(s): ${internal
      .map((l) => l.name)
      .join(', ')}`
  );

  // 5: Visit each internal link, verify it loads, and screenshot it.
  for (const link of internal) {
    rows.push(await inspectPage(page, link.name, link.url));
  }

  // 6: Return to the home page.
  await page.goto(SITE_URL, { waitUntil: 'load' });

  // 8 + 9: Build the markdown report and write it to disk.
  const header =
    '| Page name | URL | Status | Has nav | Has footer | Screenshot path |\n' +
    '| --- | --- | --- | --- | --- | --- |';
  const lines = rows.map(
    (r) =>
      `| ${r.name} | ${r.url} | ${r.status} | ${r.hasNav ? '✅' : '❌'} | ${
        r.hasFooter ? '✅' : '❌'
      } | ${r.screenshot} |`
  );
  const report =
    `# Browser QA Report\n\n` +
    `Site: ${SITE_URL}\n\n` +
    `${rows.length} page(s) checked.\n\n` +
    `${header}\n${lines.join('\n')}\n`;

  fs.writeFileSync(REPORT_PATH, report);
  console.log(`\n${report}\nReport saved to ${REPORT_PATH}`);
});

// 7: Empty contact form must be blocked by required-field validation.
test('contact form blocks empty submission', async ({ page }) => {
  await page.goto(SITE_URL, { waitUntil: 'load' });
  await page.locator('#booking-form').scrollIntoViewIfNeeded();

  await page.click('#booking-form button[type="submit"]');

  // The first required field reports it's missing, so the browser blocks submit.
  const nameMissing = await page
    .locator('#bk-name')
    .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
  expect(nameMissing, 'empty name field should be flagged as missing').toBe(true);

  // The success panel must NOT appear — nothing was submitted.
  await expect(page.locator('#booking-ok')).toBeHidden();
  console.log('✓ Empty submission blocked by required-field validation');
});
