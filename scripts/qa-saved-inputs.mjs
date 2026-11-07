import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('test-results', { recursive: true });

const base = process.env.BASE_URL || 'http://127.0.0.1:3048';
const results = [];
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  const errors = [];
  const initial = await context.newPage();
  await initial.goto(base, { waitUntil: 'networkidle' });
  const downloading = initial.waitForEvent('download');
  await initial.getByRole('button', { name: 'Download the numbers' }).click();
  const download = await downloading;
  const report = JSON.parse(await readFile(await download.path(), 'utf8'));
  const baseline = { version: report.version, exit: report.exit, portfolio: report.portfolio, insurance: report.insurance };
  const precise = structuredClone(baseline);
  precise.exit.exitCents = 10_050_000_000;
  precise.exit.founderBps = 4001;
  precise.exit.feeBps = 225;
  async function open(scenario) {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/#s=${encodeURIComponent(JSON.stringify(scenario))}`, { waitUntil: 'networkidle' });
    await page.getByText('More deal assumptions', { exact: false }).click();
    return page;
  }
  async function arrow(page, label, key, expected) {
    const range = page.getByLabel(label, { exact: true });
    await range.focus();
    await range.press(key);
    await page.waitForFunction(({ label, expected }) => {
      const element = [...document.querySelectorAll('label')].find(element => element.textContent === label);
      return document.getElementById(element.htmlFor).value === expected;
    }, { label, expected });
    assert.equal(await range.inputValue(), expected);
  }

  const page = await open(precise);
  for (const [label, expected] of [['The company sells for', '100.5'], ['Founder ownership', '40.01'], ['Transaction costs', '2.25']]) {
    assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), expected);
    assert.equal(await page.getByLabel(label, { exact: true }).getAttribute('step'), 'any');
  }
  await page.getByRole('button', { name: 'Show every step', exact: true }).click();
  assert.match(await page.locator('dialog').innerText(), /29,478,992\.91/);
  assert.match(await page.locator('dialog').innerText(), /2,261,250\.00/);
  await page.keyboard.press('Escape');
  await arrow(page, 'Transaction costs', 'ArrowRight', '2.5');
  assert.equal(await page.getByLabel('Transaction costs', { exact: true }).getAttribute('step'), '0.5');
  await arrow(page, 'Transaction costs', 'ArrowLeft', '2');
  await arrow(page, 'Founder ownership', 'ArrowDown', '40');
  await arrow(page, 'The company sells for', 'ArrowRight', '101');
  await arrow(page, 'The company sells for', 'ArrowLeft', '100');
  assert.equal(await page.getByTestId('founder-net').innerText(), '$29.4m');

  const second = await open(precise);
  await arrow(second, 'Transaction costs', 'ArrowLeft', '2');
  await arrow(second, 'Founder ownership', 'ArrowUp', '41');
  const pointerPage = await open(precise);
  const range = pointerPage.getByLabel('Transaction costs', { exact: true });
  await range.scrollIntoViewIfNeeded();
  const box = await range.boundingBox();
  await pointerPage.mouse.click(box.x + box.width * 0.53, box.y + box.height / 2);
  const pointerValue = Number(await range.inputValue());
  assert.equal(pointerValue % 0.5, 0);
  assert.equal(await range.getAttribute('step'), '0.5');

  const boundary = structuredClone(precise);
  boundary.exit.founderBps = 2999;
  boundary.exit.investorBps = 6001;
  const edge = await open(boundary);
  assert.equal(await edge.getByLabel('Founder ownership', { exact: true }).getAttribute('max'), '29.99');
  await arrow(edge, 'Founder ownership', 'ArrowRight', '29.99');
  await arrow(edge, 'Founder ownership', 'ArrowLeft', '29');
  const afterDownload = edge.waitForEvent('download');
  await edge.getByRole('button', { name: 'Download the numbers' }).click();
  const after = JSON.parse(await readFile(await (await afterDownload).path(), 'utf8'));
  assert.equal(after.exit.founderBps, 2900);
  assert.equal(after.exit.investorBps, 6001);
  assert(Number.isSafeInteger(after.results.exit.founderNetCents));
  const belowMin = structuredClone(precise);
  belowMin.exit.investorBps = 1;
  const smallInvestor = await open(belowMin);
  assert.equal(await smallInvestor.getByLabel('Investors’ ownership', { exact: true }).inputValue(), '0.01');
  await arrow(smallInvestor, 'Investors’ ownership', 'ArrowUp', '1');
  belowMin.exit.founderBps = 9999;
  belowMin.exit.teamBps = 0;
  const noGrid = await open(belowMin);
  await arrow(noGrid, 'Investors’ ownership', 'ArrowRight', '0.01');
  await arrow(noGrid, 'Founder ownership', 'ArrowLeft', '99');
  await arrow(noGrid, 'Investors’ ownership', 'ArrowRight', '1');
  assert.deepEqual(errors, []);
  results.push({ browser: name, exactImportedInputs: 'passed', adjacentArrowSteps: 'passed', pointerGrid: 'passed', fractionalUpperBound: 'passed', importedInvestorBelowControlMinimum: 'passed', integerExport: 'passed', runtimeErrors: errors });
  await browser.close();
}
await writeFile('test-results/saved-inputs-report.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
