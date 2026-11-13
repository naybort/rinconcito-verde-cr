import { test, expect } from '@playwright/test';

for (const width of [320, 1280]) {
 test('riego y mínimo de 3 segundos a ' + width + 'px', async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await page.clock.install({ time: new Date('2026-11-13T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-13T00:00:01Z'));
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('status')).toHaveText('Preparando tu rincón verde…');
  await expect(page.getByRole('heading', { name: 'Encontrá tu próxima planta' })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.rv-watering-can').evaluate(el => getComputedStyle(el).animationName)).toBe('rv-pour');
  await page.evaluate(() => { for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = 1200; } });
  await page.screenshot({ path: `test-results/loading-${width}.png`, fullPage: true });
  await page.clock.runFor(2999);
  await expect(page.getByRole('status')).toHaveText('Preparando tu rincón verde…');
  await page.clock.runFor(1);
  await expect(page.getByRole('heading', { name: 'Encontrá tu próxima planta' })).toBeVisible();
  await expect(page.locator('.rv-loading-screen')).toHaveCount(0);
 });
}
test('admin respeta movimiento reducido y conserva el acceso privado', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' });
 await page.setViewportSize({ width: 390, height: 844 });
 await page.clock.install({ time: new Date('2026-11-13T00:00:00Z') });
 await page.clock.pauseAt(new Date('2026-11-13T00:00:01Z'));
 await page.goto('/admin', { waitUntil: 'networkidle' });
 await expect(page.locator('.rv-loading-screen')).toBeVisible();
 expect(await page.locator('.rv-watering-can').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
 expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.screenshot({ path: 'test-results/loading-reduced-motion.png', fullPage: true });
 await page.clock.runFor(3000);
 await expect(page.getByRole('heading', { name: 'Administración privada' })).toBeVisible();
 await expect(page.getByText(/Administración pendiente de configuración/)).toBeVisible();
});
