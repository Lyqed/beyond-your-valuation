import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:3048';
await mkdir('test-results', { recursive: true });
const reports = [];

async function textIs(page, id, text) {
  await page.waitForFunction(({ id, text }) => document.querySelector(`[data-testid="${id}"]`)?.textContent === text, { id, text });
}
async function noOverflow(page) {
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert(widths.document <= widths.viewport, `Horizontal overflow: ${JSON.stringify(widths)}`);
}
async function announcementIncludes(page, text) {
  await page.waitForFunction(text => document.querySelector('.sr-only[role="status"][aria-live="polite"][aria-atomic="true"]')?.textContent.includes(text), text);
}
async function focusMovesInto(page, chapter) {
  assert.equal(await page.evaluate(() => document.activeElement?.closest('section.chapter')?.id), chapter, `Focus did not enter ${chapter}`);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('section.chapter')?.id), chapter, `Tab left ${chapter} after chapter navigation`);
}
async function stickyOutcome(page, chapter, expected) {
  const feedback = page.locator(`#${chapter} > .chapter-feedback`);
  assert.match(await feedback.innerText(), expected);
  assert(await feedback.isVisible(), 'Active chapter outcome must be visible');
  assert.equal(await page.locator('.chapter-feedback:visible').count(), 1, 'Only one chapter outcome may be visible');
  const bounds = await feedback.evaluate(element => {
    const rect = element.getBoundingClientRect(), nav = document.querySelector('.chapter-nav').getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, navBottom: nav.bottom, viewportHeight: innerHeight, viewportWidth: innerWidth, position: getComputedStyle(element).position };
  });
  assert.equal(bounds.position, 'sticky');
  assert(bounds.top >= bounds.navBottom - 1 && bounds.bottom <= bounds.viewportHeight && bounds.left >= 0 && bounds.right <= bounds.viewportWidth, `Outcome not visible below chapter navigation: ${JSON.stringify(bounds)}`);
}
async function renamedMetadata(page, methodology = false) {
  const title = methodology ? 'Assumptions | Beyond Your Valuation' : 'Beyond Your Valuation';
  const canonical = 'https://beyondyourvaluation.com' + (methodology ? '/methodology/' : '/');
  assert.equal(await page.title(), title);
  assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, canonical);
  assert.equal(new URL(await page.locator('meta[property="og:url"]').getAttribute('content')).href, canonical);
  assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), title);
  assert.equal(await page.locator('meta[name="twitter:title"]').getAttribute('content'), title);
  assert.equal(await page.locator('meta[property="og:site_name"]').getAttribute('content'), 'Beyond Your Valuation');
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    assert.equal(await page.locator(selector).getAttribute('content'), 'https://beyondyourvaluation.com/og.png');
  }
}
async function brandFits(page) {
  assert.equal(await page.locator('.brand').getAttribute('aria-label'), 'Beyond Your Valuation, home');
  assert.match(await page.locator('.brand').innerText(), /beyond your\s+valuation\./);
  const bounds = await page.evaluate(() => {
    const brand = document.querySelector('.brand').getBoundingClientRect();
    const links = document.querySelector('.header-links').getBoundingClientRect();
    return {brandLeft: brand.left, brandRight: brand.right, linksLeft: links.left, linksRight: links.right, viewport: innerWidth};
  });
  assert(bounds.brandLeft >= 0 && bounds.brandRight <= bounds.linksLeft && bounds.linksRight <= bounds.viewport, `Brand/header overlap: ${JSON.stringify(bounds)}`);
}

for (const [name, engine, width] of [['chromium', chromium, 1440], ['chromium', chromium, 390], ['webkit', webkit, 1440], ['webkit', webkit, 390]]) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
  const errors = [], externalRequests = [], failedResponses = [];
  const attach = page => {
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) externalRequests.push(request.url()); });
    page.on('response', response => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  };
  const page = await context.newPage(); attach(page);
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await renamedMetadata(page);
    await brandFits(page);
    assert.equal(await page.locator('.brand').getAttribute('href'), '#top');
    assert.equal(await page.locator('.header-links a').first().getAttribute('href'), '/methodology/');
    assert.equal(await page.locator('.source-link').getAttribute('href'), 'https://github.com/Lyqed/beyond-your-valuation');
    await textIs(page, 'founder-net', '$29.4m');
    await textIs(page, 'retained-loss', '$400k');
    await textIs(page, 'insurance-gap', '$450k');
    await textIs(page, 'board-value', '40%');
    assert.equal(await page.locator('.hero .tiles > i').count(), 100);
    await page.getByRole('button', { name: 'After the deal', exact: true }).click();
    await textIs(page, 'board-value', '$29.4m');
    assert.match(await page.locator('.hero .tiles').getAttribute('aria-label'), /Founder cash \$29\.4m/);
    await page.screenshot({ path: `test-results/${name}-${width}-proceeds-board.png` });
    await page.getByRole('button', { name: 'Ownership', exact: true }).click();
    await noOverflow(page);
    await page.screenshot({ path: `test-results/${name}-${width}-hero.png` });

    await page.getByRole('button', { name: 'Find out', exact: true }).click();
    await focusMovesInto(page, 'exit');
    await page.getByRole('button', { name: /Exit proceeds/ }).click();
    await focusMovesInto(page, 'exit');
    assert(await page.locator('#exit h2').isVisible());
    await page.screenshot({ path: `test-results/${name}-${width}-deal.png` });
    await page.getByRole('button', { name: /^Participating/ }).click();
    await textIs(page, 'founder-net', '$20.4m');
    await announcementIncludes(page, 'Founder net cash: $20,400,000.00');
    if (width === 390) await stickyOutcome(page, 'exit', /\$20\.4m/);
    await page.getByRole('button', { name: 'After the deal', exact: true }).click();
    await textIs(page, 'board-value', '$20.4m');
    await page.getByLabel('Founder ownership', { exact: true }).fill('35');
    await page.getByRole('button', { name: 'Ownership', exact: true }).click();
    await textIs(page, 'board-value', '35%');
    assert.match(await page.locator('.hero .tiles').getAttribute('aria-label'), /Founder 35%/);
    await page.getByLabel('Founder ownership', { exact: true }).fill('40');
    await textIs(page, 'board-value', '40%');
    await page.getByRole('button', { name: '2× their investment', exact: true }).click();
    await textIs(page, 'founder-net', '$11.4m');
    await page.getByRole('button', { name: /^Non-participating/ }).click();
    await textIs(page, 'founder-net', '$19m');
    await page.getByRole('button', { name: '1× their investment', exact: true }).click();
    await page.getByRole('button', { name: 'Show every step', exact: true }).click();
    await page.locator('dialog[open]').waitFor();
    assert.match(await page.locator('dialog').innerText(), /29,400,000\.00/);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/${name}-${width}-receipt.png` });
    await page.keyboard.press('Escape');
    await page.locator('dialog[open]').waitFor({ state: 'hidden' });

    await page.getByLabel('The company sells for', { exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByLabel('The company sells for', { exact: true }).inputValue(), '101');
    await page.keyboard.press('ArrowLeft');
    await textIs(page, 'founder-net', '$29.4m');
    await page.getByText('More deal assumptions', { exact: false }).click();
    await page.getByLabel('Illustrative founder tax rate', { exact: true }).fill('30');
    await textIs(page, 'founder-net', '$27.4m');
    await page.getByLabel('Illustrative founder tax rate', { exact: true }).scrollIntoViewIfNeeded();
    if (width === 390) await stickyOutcome(page, 'exit', /\$27\.4m/);
    await page.getByLabel('Illustrative founder tax rate', { exact: true }).fill('25');
    await page.getByText('More deal assumptions', { exact: false }).click();

    await page.getByRole('button', { name: 'Explore the $5m example', exact: true }).click();
    await focusMovesInto(page, 'portfolio');
    assert.match(await page.locator('#portfolio h2').innerText(), /\$5m/);
    assert.match(await page.locator('.fx-explanation').innerText(), /₪3\.60.*₪18m/);
    const dollarAssets = await page.locator('.asset-list').innerText();
    await page.getByRole('button', { name: /The dollar weakens/ }).click();
    assert.match(await page.locator('.fx-explanation').innerText(), /₪2\.88.*₪14\.4m/);
    assert.equal(await page.locator('.asset-list').innerText(), dollarAssets, 'FX alone changed dollar asset values');
    await announcementIncludes(page, '14,400,000.00');
    await page.getByRole('button', { name: 'Apply all events', exact: true }).click();
    await textIs(page, 'liquidity-gap', '$462.5k');
    await announcementIncludes(page, 'Funding shortfall: $462,500.00');
    if (width === 390) await stickyOutcome(page, 'portfolio', /30-day shortfall[\s\S]*\$462\.5k/);
    await page.locator('.liquidity-result').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/${name}-${width}-liquidity.png` });
    await page.getByRole('button', { name: 'More liquid', exact: true }).click();
    assert(!(await page.locator('.liquidity-result').getAttribute('class')).includes('has-gap'));
    await page.getByRole('button', { name: 'Mostly illiquid', exact: true }).click();
    await textIs(page, 'liquidity-gap', '$462.5k');
    await page.getByRole('button', { name: 'Or use your $29.4m proceeds', exact: true }).click();
    await focusMovesInto(page, 'portfolio');
    assert.equal(await page.locator('.allocation-panel .panel-heading strong').textContent(), '$29.4m');
    await page.getByRole('button', { name: 'The $5m example', exact: true }).click();
    await textIs(page, 'liquidity-gap', '$462.5k');

    await page.getByRole('button', { name: 'Explore insurance', exact: true }).click();
    await focusMovesInto(page, 'insurance');
    assert(await page.locator('.timing-panel').evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('.insurance-workspace')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'Insurance timing must precede contract controls');
    assert.deepEqual(await page.locator('.incident-breakdown strong').allTextContents(), ['$600k', '$300k', '$300k']);
    await page.getByRole('button', { name: 'Day 30', exact: true }).click();
    await textIs(page, 'insurance-gap', '$0');
    await announcementIncludes(page, 'Cash gap within 30 days: $0.00');
    if (width === 390) await stickyOutcome(page, 'insurance', /30-day cash gap[\s\S]*\$0/);
    await page.getByRole('button', { name: /Ransom payments/ }).click();
    await textIs(page, 'retained-loss', '$200k');
    await announcementIncludes(page, 'Business retains: $200,000.00');
    await page.getByRole('button', { name: /Ransom payments/ }).click();
    await page.getByLabel('Overall policy limit', { exact: true }).fill('0');
    await textIs(page, 'retained-loss', '$1.2m');
    await textIs(page, 'insurance-gap', '$450k');
    await page.getByLabel('Overall policy limit', { exact: true }).fill('1');
    await textIs(page, 'insurance-gap', '$0');
    await page.locator('.timing-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/${name}-${width}-timing.png` });

    assert.deepEqual(await page.locator('.ending-recap dt').allTextContents(), ['The sale', 'The portfolio', 'The policy']);
    assert.deepEqual(await page.locator('.ending-recap dd').evaluateAll(elements => elements.map(element => element.firstChild.textContent)), ['$29.4m', '$1.2m', '$800k']);
    assert.match(await page.locator('.ending-recap').innerText(), /day 30/);

    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the numbers', exact: false }).click();
    const download = await downloading;
    assert.equal(download.suggestedFilename(), 'beyond-your-valuation-scenario.json');
    const report = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(report.results.exit.founderNetCents, 2_940_000_000);
    assert.equal(report.results.portfolio.shortfallCents, 46_250_000);
    assert.equal(report.results.insurance.shortfallCents, 0);
    assert.equal(report.methodologyVersion, '0.1.0');
    const shared = { version: report.version, exit: report.exit, portfolio: report.portfolio, insurance: report.insurance };
    assert.equal(shared.insurance.paymentDelayDays, 30);
    assert.equal(shared.portfolio.marketShock, true);
    const recipient = await context.newPage(); attach(recipient);
    await recipient.goto(`${base}/#s=${encodeURIComponent(JSON.stringify(shared))}`, { waitUntil: 'networkidle' });
    await textIs(recipient, 'founder-net', '$29.4m');
    await textIs(recipient, 'liquidity-gap', '$462.5k');
    await textIs(recipient, 'insurance-gap', '$0');
    await noOverflow(recipient);
    await recipient.close();

    // Going to the assumptions and back preserves the three independent examples in this tab.
    await page.getByLabel('The company sells for', { exact: true }).fill('80');
    await textIs(page, 'founder-net', '$23.5m');
    await page.locator('.header-links a').first().click();
    await page.waitForURL('**/methodology/');
    await renamedMetadata(page, true);
    assert.equal(await page.locator('.back-link').getAttribute('href'), '/');
    assert.match(await page.locator('h1').innerText(), /Assumptions and calculations/);
    await noOverflow(page);
    await page.locator('.back-link').click();
    await textIs(page, 'founder-net', '$23.5m');
    await textIs(page, 'liquidity-gap', '$462.5k');
    await textIs(page, 'insurance-gap', '$0');

    // An explicit shared scenario takes precedence over restored tab state.
    await page.goto(`${base}/methodology/`, { waitUntil: 'networkidle' });
    const sharedA = `${base}/#s=${encodeURIComponent(JSON.stringify(shared))}`;
    const alternative = { ...shared, exit: { ...shared.exit, participation: 'participating' } };
    const sharedB = `#s=${encodeURIComponent(JSON.stringify(alternative))}`;
    await page.goto(sharedA, { waitUntil: 'networkidle' });
    await textIs(page, 'founder-net', '$29.4m');
    await textIs(page, 'liquidity-gap', '$462.5k');
    await textIs(page, 'insurance-gap', '$0');
    const documentToken = await page.evaluate(() => (window.__scenarioDocument = Math.random()));
    await page.evaluate(hash => { location.hash = hash; }, sharedB);
    await textIs(page, 'founder-net', '$20.4m');
    assert.equal(await page.evaluate(() => window.__scenarioDocument), documentToken, 'Shared hash navigation reloaded the document');
    await page.goBack();
    await textIs(page, 'founder-net', '$29.4m');
    assert.equal(await page.evaluate(() => window.__scenarioDocument), documentToken);
    await page.goForward();
    await textIs(page, 'founder-net', '$20.4m');
    await page.evaluate(() => { location.hash = '#s=invalid'; });
    await textIs(page, 'founder-net', '$29.4m');
    await textIs(page, 'insurance-gap', '$450k');
    await textIs(page, 'liquidity-gap', '$150k');
    assert.match(await page.locator('.toast[role="status"]').innerText(), /invalid/);

    // Invalid explicit links also beat a saved scenario after a full document navigation.
    await page.getByRole('button', { name: /^Participating/ }).click();
    await textIs(page, 'founder-net', '$20.4m');
    await page.goto(`${base}/methodology/`, { waitUntil: 'networkidle' });
    await page.goto(`${base}/#s=invalid`, { waitUntil: 'networkidle' });
    await textIs(page, 'founder-net', '$29.4m');
    await textIs(page, 'insurance-gap', '$450k');
    assert.match(await page.locator('.toast[role="status"]').innerText(), /invalid/);

    // Reset clears both the explicit link and the retained choices, including after reload.
    await page.getByRole('button', { name: /^Participating/ }).click();
    await textIs(page, 'founder-net', '$20.4m');
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
    await textIs(page, 'insurance-gap', '$450k');
    await textIs(page, 'liquidity-gap', '$150k');
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('beyond-your-valuation:scenario:v1')), null);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'intro-title');
    await page.reload({ waitUntil: 'networkidle' });
    await textIs(page, 'founder-net', '$29.4m');
    await textIs(page, 'liquidity-gap', '$150k');
    await textIs(page, 'insurance-gap', '$450k');
    if (name === 'chromium' && width === 1440) {
      for (const checkWidth of [320, 768, 1920]) { await page.setViewportSize({ width: checkWidth, height: 950 }); await noOverflow(page); await brandFits(page); }
      await page.setViewportSize({ width, height: 950 });
      await page.getByLabel('The company sells for', { exact: true }).fill('0');
      await page.getByRole('button', { name: 'After the deal', exact: true }).click();
      await textIs(page, 'board-value', '$0');
      assert.equal(await page.locator('.hero .tiles > i').count(), 100);
      await noOverflow(page);
      await page.getByLabel('The company sells for', { exact: true }).fill('100');
      await textIs(page, 'board-value', '$29.4m');
      const zero = { ...shared, exit: { ...shared.exit, founderBps: 10_000, teamBps: 0, investorBps: 0, investmentCents: 0 } };
      const edge = await context.newPage(); attach(edge);
      await edge.goto(`${base}/#s=${encodeURIComponent(JSON.stringify(zero))}`, { waitUntil: 'networkidle' });
      await textIs(edge, 'founder-net', '$73.5m');
      await edge.getByText('More deal assumptions', { exact: false }).click();
      assert.equal(await edge.getByLabel('Capital invested', { exact: true }).getAttribute('max'), '0');
      await edge.getByLabel('Founder ownership', { exact: true }).fill('90');
      await edge.getByLabel('Investors’ ownership', { exact: true }).fill('10');
      await edge.getByLabel('Capital invested', { exact: true }).fill('30');
      await noOverflow(edge); await edge.close();
    }
    await page.goto(`${base}/methodology/`, { waitUntil: 'networkidle' });
    await renamedMetadata(page, true);
    assert.equal(await page.locator('.back-link').getAttribute('href'), '/');
    assert.match(await page.locator('h1').innerText(), /Assumptions and calculations/);
    await noOverflow(page);
    await page.goto(`${base}/#s=invalid`, { waitUntil: 'networkidle' });
    await textIs(page, 'founder-net', '$29.4m');
    assert.match(await page.locator('.toast[role="status"]').innerText(), /invalid/);
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []); assert.deepEqual(failedResponses, []);
    reports.push({ browser: name, width, result: 'passed', brand: 'Beyond Your Valuation', canonicalDomain: 'beyondyourvaluation.com', downloadFilename: 'beyond-your-valuation-scenario.json', runtimeErrors: errors, externalRequests, failedResponses });
    console.log(`${name} ${width}px: interactions, calculations, saved links, download and layout passed`);
  } catch (error) {
    await page.screenshot({ path: `test-results/FAILED-${name}-${width}.png`, fullPage: true });
    console.error({ errors, externalRequests, failedResponses });
    throw error;
  } finally { await browser.close(); }
}
await writeFile('test-results/browser-report.json', JSON.stringify(reports, null, 2) + '\n');
