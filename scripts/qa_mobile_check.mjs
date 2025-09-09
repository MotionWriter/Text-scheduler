import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'iPhone SE portrait', width: 320, height: 568 },
  { name: 'iPhone SE landscape', width: 568, height: 320 },
  { name: 'iPhone 13 Pro Max portrait', width: 428, height: 926 },
  { name: 'iPhone 13 Pro Max landscape', width: 926, height: 428 },
  { name: 'Pixel 5 portrait', width: 393, height: 851 },
  { name: 'Pixel 5 landscape', width: 851, height: 393 },
];

async function checkNoHorizontalScroll(page) {
  return await page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const cw = document.documentElement.clientWidth;
    const bw = document.body.scrollWidth;
    return { ok: sw <= cw && bw <= cw, sw, cw, bw };
  });
}

async function openScheduleDialogIfPresent(page) {
  // Try mobile header button first
  const mobileButton = page.locator('button:has-text("Schedule")');
  if (await mobileButton.first().isVisible().catch(() => false)) {
    await mobileButton.first().click({ timeout: 2000 }).catch(() => {});
    return true;
  }
  // Try desktop header
  const desktopButton = page.locator('button:has-text("Schedule Message")');
  if (await desktopButton.first().isVisible().catch(() => false)) {
    await desktopButton.first().click({ timeout: 2000 }).catch(() => {});
    return true;
  }
  return false;
}

async function checkDialogScroll(page) {
  return await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]') || document.querySelector('[data-state="open"]');
    if (!dialog) return { found: false };
    const dialogScrollable = dialog.scrollHeight > dialog.clientHeight;
    const bodyScrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
    return { found: true, dialogScrollable, bodyScrollable };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });

    // Allow some client-side render
    await page.waitForTimeout(600);

    const scroll = await checkNoHorizontalScroll(page);

    // Try to open a dialog and verify it scrolls internally
    let dialog = { found: false };
    try {
      const opened = await openScheduleDialogIfPresent(page);
      if (opened) {
        await page.waitForTimeout(300);
        dialog = await checkDialogScroll(page);
      }
    } catch (_) {}

    results.push({ viewport: vp.name, viewportSize: { w: vp.width, h: vp.height }, scroll, dialog });

    await page.close();
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

