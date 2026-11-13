import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
// Existing source PNGs may contain metadata after IEND; pngjs rejects that trailer.
function pngBytes(buffer: Buffer) {
 let offset = 8;
 while (offset + 12 <= buffer.length) {
  const length = buffer.readUInt32BE(offset);
  const type = buffer.toString('ascii', offset + 4, offset + 8);
  offset += length + 12;
  if (type === 'IEND') return buffer.subarray(0, offset);
 }
 return buffer;
}
const decode = (buffer: Buffer) => { const png = PNG.sync.read(buffer); return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data; };

test.beforeEach(async ({ page }) => {
 // Local files only. Any accidental remote integration makes this suite fail.
 await page.route(/^https?:\/\//, route => {
  expect(new URL(route.request().url()).hostname).toBe('127.0.0.1');
  return route.continue();
 });
});
for (const width of [320, 390, 768, 1280]) {
 test('galería completa, teclado, foco y descarga a ' + width, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/#/plantas/demo-monstera');
  const opener = page.getByRole('button', { name: 'Ver foto completa', exact: true });
  await expect(page.getByRole('img', { name: 'Monstera de hojas grandes en una maceta blanca' })).toHaveCSS('object-fit', 'contain');
  await page.screenshot({ path: `test-results/full-plant-${width}.png`, fullPage: true });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Foto siguiente' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('status')).toContainText('Foto 2 de 2');
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('status')).toContainText('Foto 1 de 2');
  await page.screenshot({ path: `test-results/full-photo-${width}.png`, fullPage: true });
  const waiting = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar foto con marca' }).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe('demo-monstera-foto-1-rinconcito-verde.png');
  const file = `test-results/branded-photo-${width}.png`;
  await download.saveAs(file);
  const result = PNG.sync.read(await readFile(file));
  const original = PNG.sync.read(pngBytes(await readFile('public/images/monstera.png')));
  const inset = (result.width - original.width) / 2;
  expect(inset).toBeGreaterThan(0);
  expect(result.height).toBeGreaterThan(original.height + 2 * inset);
  // Source rectangle preserved pixel-for-pixel for this opaque existing photograph.
  for (let y = 0; y < original.height; y++) {
   const offset = ((y + inset) * result.width + inset) * 4;
   expect(result.data.subarray(offset, offset + original.width * 4)).toEqual(original.data.subarray(y * original.width * 4, (y + 1) * original.width * 4));
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
  await expect(page.getByRole('link', { name: 'Consultar esta planta por WhatsApp' })).toHaveAttribute('href', /wa.me\/50671160290/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
 });
}
for (const width of [320, 1280]) {
 test('etiqueta real, copias, SVG y PDF a ' + width, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/tests/labels-browser.html');
  const print = page.getByRole('button', { name: 'Imprimir / guardar PDF' });
  await expect(print).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Sansevieria', exact: true }).check();
  await page.getByLabel('Copias por ficha', { exact: true }).fill('3');
  await expect(page.locator('.plant-label')).toHaveCount(3);
  await expect(print).toBeEnabled();
  const sources = await page.locator('.plant-label img').evaluateAll(images => images.map(image => (image as HTMLImageElement).src));
  expect(new Set(sources).size).toBe(1);
  expect(decode(await page.locator('.plant-label').first().screenshot())).toBe('https://rinconcito-verde-cr.web.app/#/plantas/sansevieria');
  await page.screenshot({ path: `test-results/branded-labels-${width}.png`, fullPage: true });
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar etiqueta de Sansevieria' }).click();
  const download = await waiting; await download.saveAs(`test-results/etiqueta-${width}.svg`);
  const svg = await readFile(`test-results/etiqueta-${width}.svg`, 'utf8');
  expect(svg).toContain('width="60mm" height="50mm"'); expect(svg).not.toContain('href="/');
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'yes'; }; });
  await print.click(); expect(await page.locator('body').getAttribute('data-printed')).toBe('yes');
  await page.getByLabel('Ancho (mm)', { exact: true }).fill('50');
  await page.getByLabel('Alto (mm)', { exact: true }).fill('45');
  await expect(print).toBeEnabled();
  expect(decode(await page.locator('.plant-label').first().screenshot())).toContain('/plantas/sansevieria');
  await page.getByLabel('Copias por ficha', { exact: true }).fill('1.5');
  await expect(print).toBeDisabled(); await expect(page.locator('.plant-label')).toHaveCount(0);
  await page.getByLabel('Copias por ficha', { exact: true }).fill('12');
  await page.getByRole('checkbox', { name: /^Planta de nombre largo/ }).check();
  await expect(page.locator('.plant-label')).toHaveCount(24);
  await expect(print).toBeEnabled();
  await page.getByRole('navigation', { name: 'Paginación de vista previa de etiquetas', exact: true }).getByRole('button', { name: 'Ir a la página 3', exact: true }).click();
  expect(decode(await page.locator('.plant-label').last().screenshot())).toBe('https://rinconcito-verde-cr.web.app/#/plantas/' + 'a'.repeat(80));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('navigation')).not.toBeVisible();
  await expect(page.getByText('Controles externos de prueba')).not.toBeVisible();
  await page.pdf({ path: `test-results/labels-${width}.pdf`, format: 'A4', printBackground: true, displayHeaderFooter: false, scale: 1 });
 });
}
test('fallo del ícono y reintento no imprimen etiquetas incompletas', async ({ page }) => {
 await page.route('**/rinconcito-icon.png', route => route.abort());
 await page.goto('/tests/labels-browser.html');
 await page.getByRole('checkbox', { name: 'Sansevieria', exact: true }).check();
 await expect(page.getByRole('alert')).toContainText('No se pudieron preparar');
 await expect(page.getByRole('button', { name: 'Imprimir / guardar PDF' })).toBeDisabled();
 await page.unroute('**/rinconcito-icon.png');
 await page.getByRole('button', { name: 'Reintentar' }).click();
 await expect(page.getByRole('button', { name: 'Imprimir / guardar PDF' })).toBeEnabled();
});
test('foto fallida mantiene navegación y permite cerrar el visor', async ({ page }) => {
 await page.route('**/images/monstera.png', route => route.abort());
 await page.goto('/#/plantas/demo-monstera');
 await expect(page.getByText('Imagen no disponible')).toBeVisible();
 await page.getByRole('button', { name: 'Ver foto completa', exact: true }).click();
 await page.getByRole('dialog').getByRole('button', { name: 'Descargar foto con marca' }).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
 await page.getByRole('dialog').getByRole('button', { name: 'Foto siguiente' }).click();
 await expect(page.getByRole('dialog').getByRole('img', { name: 'Detalle de una hoja verde de monstera' })).toBeVisible();
 await page.getByRole('button', { name: 'Cerrar foto' }).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
});
