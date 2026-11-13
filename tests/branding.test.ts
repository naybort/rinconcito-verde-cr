import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
import { createLabelSvg, labelLines, labelQrOptions } from '../src/features/admin/labelTemplate';
import { photoLayout } from '../src/shared/brand/photoExport';

const icon = 'data:image/png;base64,' + readFileSync('public/rinconcito-icon.png').toString('base64');
const qrFromSvg = (svg: string) => {
 const embedded = [...svg.matchAll(/href="(data:image\/png;base64,[^"]+)"/g)].at(-1)![1];
 return PNG.sync.read(Buffer.from(embedded.split(',')[1], 'base64'));
};
describe('etiqueta QR de marca', () => {
 for (const id of ['sansevieria', 'demo-monstera', 'a'.repeat(80)]) {
  it('decodifica la URL estable y conserva zona blanca para ' + id, async () => {
   const svg = await createLabelSvg({ id, name: 'Planta de prueba' }, 50, 45, icon);
   const png = qrFromSvg(svg);
   expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe('https://rinconcito-verde-cr.web.app/#/plantas/' + id);
   expect(labelQrOptions.margin).toBe(4);
   // All four outer edges are fully white and opaque.
   for (let p = 0; p < png.width; p++) for (const [x, y] of [[p, 0], [p, png.height - 1], [0, p], [png.width - 1, p]]) {
    expect([...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)]).toEqual([255, 255, 255, 255]);
   }
   const renamed = qrFromSvg(await createLabelSvg({ id, name: 'Otro nombre' }, 100, 150, icon));
   expect(renamed.data).toEqual(png.data);
  });
 }
 it('escapa nombres, conserva texto largo y rechaza dimensiones inválidas', async () => {
  const name = '<script>& "Planta"';
  const svg = await createLabelSvg({ id: 'test', name }, 60, 50, icon);
  expect(svg).not.toContain('<script>'); expect(svg).toContain('&lt;script&gt;&amp;');
  expect(labelLines('a'.repeat(120), 35).join('')).toBe('a'.repeat(120));
  await expect(createLabelSvg({ id: 'test', name }, 49, 45, icon)).rejects.toThrow();
  await expect(createLabelSvg({ id: 'test', name }, 60.5, 50, icon)).rejects.toThrow();
 });
});
it('la marca queda fuera del rectángulo de foto en horizontal, vertical y cuadrado', () => {
 for (const [width, height] of [[600, 1200], [1200, 600], [1280, 1280], [6000, 4000]]) {
  const layout = photoLayout(width, height);
  expect(layout.photoWidth / layout.photoHeight).toBeCloseTo(width / height, 2);
  expect(layout.width).toBe(layout.photoWidth + 2 * layout.inset);
  expect(layout.height - layout.strip).toBe(layout.photoHeight + 2 * layout.inset);
  expect(Math.max(layout.photoWidth, layout.photoHeight)).toBeLessThanOrEqual(2400);
 }
});
