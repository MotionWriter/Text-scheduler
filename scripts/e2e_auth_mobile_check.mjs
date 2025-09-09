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

async function checkDialogScroll(page) {
  return await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]') || document.querySelector('[data-state="open"]');
    if (!dialog) return { found: false };
    const dialogScrollable = dialog.scrollHeight > dialog.clientHeight;
    const bodyScrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
    return { found: true, dialogScrollable, bodyScrollable };
  });
}

async function signInAnonymously(page) {
  // On unauthenticated landing, click the anonymous sign-in button
  const anonButton = page.getByRole('button', { name: /Sign in anonymously/i });
  await anonButton.click({ timeout: 8000 });
  // Wait for Dashboard or primary tab to be visible
  const dashboardHeading = page.getByRole('heading', { name: /Dashboard/i });
  const messagesTab = page.getByRole('tab', { name: /Scheduled Messages/i });
  await Promise.race([
    dashboardHeading.waitFor({ timeout: 15000 }).catch(() => {}),
    messagesTab.waitFor({ timeout: 15000 }).catch(() => {}),
  ]);
}

async function openScheduleDialog(page) {
  // Try mobile header Schedule button first
  const mobileBtn = page.getByRole('button', { name: /^Schedule$/ });
  if (await mobileBtn.isVisible().catch(() => false)) {
    await mobileBtn.click();
    return true;
  }
  // Try desktop button
  const desktopBtn = page.getByRole('button', { name: /Schedule Message/i });
  if (await desktopBtn.isVisible().catch(() => false)) {
    await desktopBtn.click();
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  // Go to app and sign in anonymously once
  await page.goto('http://127.0.0.1:5174/?e2e=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await signInAnonymously(page);

  // Ensure we are on Messages tab (default). If not, click Scheduled Messages tab
  const messagesTab = page.getByRole('tab', { name: /Scheduled Messages/i });
  if (await messagesTab.isVisible().catch(() => false)) {
    await messagesTab.click();
  }

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(200);

    const scroll = await checkNoHorizontalScroll(page);

    let dialog = { found: false };
    try {
      const opened = await openScheduleDialog(page);
      if (opened) {
        await page.waitForTimeout(300);
        dialog = await checkDialogScroll(page);
        // Close dialog by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    } catch (_) {}

    results.push({ viewport: vp.name, viewportSize: { w: vp.width, h: vp.height }, scroll, dialog });
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
  await browser.close();
})();

