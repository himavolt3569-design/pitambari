import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.TEST_URL || 'http://localhost:3000';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: 'Bring back the beautiful.' }).waitFor();
assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), /Poppins/i);
assert.equal(await page.locator('.section-kicker, .shine-category').count(), 0);
assert.equal(await page.locator('#product .shine-buy').isDisabled(), true);
assert.equal(await page.locator('#product').getByText('Sizes and pricing coming soon.', { exact: true }).count(), 1);
await page.screenshot({ path: 'artifacts/desktop-hero.png' });
await page.locator('#results').scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Copper bowl' }).click();
const slider = page.getByRole('slider');
await slider.focus();
await page.keyboard.press('ArrowRight');
assert.equal(await slider.getAttribute('aria-valuenow'), '52');
await page.locator('#product').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: 'artifacts/desktop-product.png' });
await page.getByRole('button', { name: 'Open cart', exact: true }).click();
assert.equal(await page.getByRole('dialog').count(), 1);
await page.keyboard.press('Escape');
assert.equal(await page.getByRole('dialog').count(), 0);
await page.getByRole('button', { name: 'Switch to Nepali' }).click();
assert.ok((await page.locator('h1').innerText()).includes('फेरि'));
await page.getByRole('button', { name: 'Switch to English' }).click();
await page.screenshot({ path: 'artifacts/desktop-full.png', fullPage: true });

// Exercise the real cart/checkout with a test-only browser cart. No catalogue or database writes.
await page.evaluate(() => localStorage.setItem('shine.cart.v1', JSON.stringify({ version: 1, state: { lines: [{ productId: 'fixture-only', variantId: 'test-size', name: 'Test bottle', variantLabel: 'Test size', image: '/shine/01_Product/super-shine-pitambari-liquid-transparent.png', unitPriceMinor: 12300, quantity: 1 }] } })));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Open cart, 1 items' }).click();
await page.getByRole('button', { name: 'Checkout', exact: true }).click();
await page.getByRole('heading', { name: 'Checkout', exact: true }).waitFor();
await page.getByLabel('Province', { exact: true }).selectOption('Bagmati');
await page.getByLabel('District', { exact: true }).selectOption('Kathmandu');
await page.getByLabel('Municipality or city').fill('Kathmandu');
await page.getByLabel('Province', { exact: true }).selectOption('Koshi');
assert.equal(await page.getByLabel('District', { exact: true }).inputValue(), '');
assert.equal(await page.getByLabel('Municipality or city').inputValue(), '');
assert.equal(await page.getByRole('button', { name: 'Place order', exact: true }).isDisabled(), true);
await page.keyboard.press('Escape');
await page.evaluate(() => localStorage.removeItem('shine.cart.v1'));

for (const width of [390, 320, 768]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow at ${width}`);
  if (width === 390) {
    await page.screenshot({ path: 'artifacts/mobile-hero.png' });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile', exact: true }).getByRole('link', { name: /Our cleaner/ }).click();
    await page.screenshot({ path: 'artifacts/mobile-product.png' });
  }
}
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('#product').scrollIntoViewIfNeeded();
const transform = await page.locator('.shine-bottle').evaluate(el => el.style.transform);
assert.equal(transform, '', 'reduced motion should remove GSAP transforms');
await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' });
assert.ok(page.url().includes('/admin/login'));
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS: desktop/mobile layout, Poppins, heading cleanup, empty catalogue, comparison keyboard, cart, checkout address reset, Nepali switch, reduced motion, protected admin.');
