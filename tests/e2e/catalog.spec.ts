import { test, expect } from '@playwright/test';
for (const width of [320,390,768,1280]) {
 test('catálogo, navegación y footer a ' + width + 'px', async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Encontrá tu próxima planta' })).toBeVisible();
  await expect(page.getByText('Catálogo de demostración', { exact: false })).toHaveCount(0);
  await page.getByRole('searchbox').fill('monstéra');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();

  const nav = await page.getByRole('navigation').boundingBox();
  const footer = await page.getByRole('contentinfo').boundingBox();
  expect(footer!.y).toBeGreaterThanOrEqual(nav!.y + nav!.height);
  await page.getByRole('link', { name: 'Vision Mind' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: 'Vision Mind' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/catalog-adjusted-' + width + '.png', fullPage: true });
  await page.getByRole('link', { name: 'Favoritos (0)' }).click();
  await expect(page.getByText('Tu rincón verde está por empezar')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('link', { name: 'Explorar plantas' }).click();
  await expect(page.getByRole('heading', { name: 'Encontrá tu próxima planta' })).toBeVisible();
  expect(errors).toEqual([]);
 });
}
test('teclado, favoritos retirados y ruta antigua', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => localStorage.setItem('rinconcito-verde:favorites:v1', JSON.stringify({version:1, plantIds:['retirada']})));
 await page.reload();
 await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
 await page.goto('/#/favoritos');
 await expect(page.getByRole('article')).toHaveCount(0);
 await page.goto('/#/plantas/retirada');
 await expect(page.getByRole('heading', { level: 1 })).toHaveText('No encontramos esa página');
});

test('detalle con iconos y favorito relleno', async ({ page }) => {
 await page.goto('/#/plantas/demo-monstera');
 await expect(page.getByRole('heading', { name: 'Cómo cuidar tu planta' })).toBeVisible();
 for (const name of ['Luz','Riego','Humedad','Temperatura']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
 await page.getByRole('button', { name: 'Añadir a favoritos' }).click();
 await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute('aria-pressed', 'true');
 await expect(page.getByRole('link', { name: 'Consultar esta planta por WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa.me\/50671160290\?text=/);
 await page.screenshot({path:'test-results/detail-icons.png',fullPage:true});
});
