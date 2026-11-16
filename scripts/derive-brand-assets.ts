import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const originalSha256 = 'bfafae49f455e39ebe84511e2ac45facd355463dbea902aa390681ddd2ebbf79';
export const houseCrop = {
 sourceWidth: 1254, sourceHeight: 1254,
 left: 386, top: 124, width: 484, height: 530, canvas: 530,
 // Pixel-center polygon mask: retains the original house, plant and interior pixels.
 polygon: [[627, 129], [864, 283], [864, 650], [470, 650], [470, 642], [426, 642], [426, 650], [390, 650], [390, 283]],
} as const;
export const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');

function inside(x: number, y: number) {
 let result = false;
 const polygon = houseCrop.polygon;
 for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
  const [ax, ay] = polygon[i], [bx, by] = polygon[j];
  if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) result = !result;
 }
 return result;
}
/** Lossless crop/mask only: no resampling, repainting, AI or changes to original bytes. */
export function deriveHouseIcon(source: Buffer) {
 if (sha256(source) !== originalSha256) throw new Error('El original no coincide con la procedencia confirmada.');
 const original = PNG.sync.read(source);
 if (original.width !== houseCrop.sourceWidth || original.height !== houseCrop.sourceHeight) throw new Error('Dimensiones inesperadas.');
 const image = new PNG({ width: houseCrop.canvas, height: houseCrop.canvas });
 image.data.fill(0);
 const offsetX = (houseCrop.canvas - houseCrop.width) / 2;
 for (let y = 0; y < houseCrop.height; y++) for (let x = 0; x < houseCrop.width; x++) {
  const sourceX = x + houseCrop.left, sourceY = y + houseCrop.top;
  if (!inside(sourceX + .5, sourceY + .5)) continue;
  const from = (sourceY * original.width + sourceX) * 4;
  const to = (y * houseCrop.canvas + x + offsetX) * 4;
  original.data.copy(image.data, to, from, from + 4);
 }
 return PNG.sync.write(image, { filterType: 4, deflateLevel: 9 });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const sourcePath = 'assets/source/rinconcito-original.png', outputPath = 'public/rinconcito-house.png';
 const source = readFileSync(sourcePath), output = deriveHouseIcon(source);
 const manifest = JSON.stringify({
  source: sourcePath, originalFileName: 'El Rinconcito Verde_ Suculentas y Plantas.png',
  sourceSha256: originalSha256, sourceDimensions: [1254, 1254],
  output: outputPath, outputSha256: sha256(output), outputDimensions: [530, 530],
  operation: 'Lossless polygon crop and transparent square padding; retained pixels unchanged, no resampling or AI.',
  crop: houseCrop, reproduce: 'node scripts/derive-brand-assets.ts', verify: 'node scripts/derive-brand-assets.ts --check',
 }, null, 2) + '\n';
 if (process.argv.includes('--check')) {
  if (!readFileSync(outputPath).equals(output) || readFileSync('assets/source/brand-provenance.json', 'utf8') !== manifest) throw new Error('Los activos o su procedencia difieren del recorte reproducible.');
  console.log('Procedencia y recorte verificados. El original permanece inalterado.');
 } else {
  writeFileSync(outputPath, output);
  writeFileSync('assets/source/brand-provenance.json', manifest);
  console.log('Icono de casita y procedencia generados desde el original confirmado.');
 }
}
