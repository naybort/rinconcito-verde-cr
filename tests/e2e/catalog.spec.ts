import { test, expect } from '@playwright/test';
for (const width of [360,390,768,1280]) {
 test('flujo completo y geometría a ' + width + 'px', async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Guardar Monstera Deliciosa en favoritos' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Quitar Monstera Deliciosa de favoritos' })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('link', { name: 'Ver detalle de Monstera Deliciosa' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monstera Deliciosa');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible();
  await page.screenshot({ path: 'test-results/detail-' + width + '.png', fullPage: true });
  await page.getByRole('link', { name: 'Ver mis favoritos (1)' }).click();
  await expect(page.getByLabel('Vista previa del mensaje')).toContainText('demo-monstera');
  await expect(page.getByRole('button', { name: 'WhatsApp pendiente de configurar' })).toBeDisabled();
  await expect(page.locator('a[href^="https://wa.me"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/favorites-' + width + '.png', fullPage: true });
  await page.getByRole('button', { name: 'Quitar Monstera Deliciosa de favoritos' }).click();
  await expect(page.getByText('Tu rincón verde está por empezar')).toBeVisible();
  await page.getByRole('link', { name: 'Explorar plantas' }).click();
  for (const img of await page.locator('img').all()) await img.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('img').evaluateAll(async images => {
   await Promise.all(images.map(image => new Promise<void>(resolve => { if ((image as HTMLImageElement).complete) resolve(); else { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true }); } })));
  });
  expect(await page.locator('img').evaluateAll(images => images.every(i => (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: 'test-results/catalog-' + width + '.png', fullPage: true });
  expect(errors).toEqual([]);
 });
}
test('teclado, datos locales corruptos y ruta desconocida', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => localStorage.setItem('rinconcito-verde:favorites:v1', '{bad'));
 await page.reload();
 await expect(page.getByText(/No pudimos recuperar/)).toBeVisible();
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
 await page.goto('/#/plantas/retirada');
 await expect(page.getByRole('heading', { level: 1 })).toHaveText('No encontramos esa página');
});
