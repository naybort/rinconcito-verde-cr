import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { expect, it } from 'vitest';
import { deriveHouseIcon, houseCrop, originalSha256, sha256 } from '../scripts/derive-brand-assets';

it('reproduce el icono desde el original confirmado y conserva cada píxel retenido', () => {
 const original = readFileSync('assets/source/rinconcito-original.png');
 const output = readFileSync('public/rinconcito-house.png');
 const manifest = JSON.parse(readFileSync('assets/source/brand-provenance.json', 'utf8'));
 expect(sha256(original)).toBe(originalSha256);
 expect(manifest.sourceSha256).toBe(originalSha256);
 expect(manifest.outputSha256).toBe(sha256(output));
 expect(deriveHouseIcon(original)).toEqual(output);
 const source = PNG.sync.read(original), crop = PNG.sync.read(output);
 expect([crop.width, crop.height]).toEqual([530, 530]);
 const offsetX = (houseCrop.canvas - houseCrop.width) / 2;
 let retained = 0, mismatches = 0;
 for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
  const target = (y * crop.width + x) * 4;
  if (!crop.data[target + 3]) continue;
  retained++;
  const origin = ((y + houseCrop.top) * source.width + x - offsetX + houseCrop.left) * 4;
  if (!crop.data.subarray(target, target + 4).equals(source.data.subarray(origin, origin + 4))) mismatches++;
 }
 expect(retained).toBeGreaterThan(150000); expect(mismatches).toBe(0);
 for (const [x, y] of [[0, 0], [529, 0], [0, 529], [529, 529]]) expect(crop.data[(y * crop.width + x) * 4 + 3]).toBe(0);
 const changed = Buffer.from(original); changed[100] ^= 1;
 expect(() => deriveHouseIcon(changed)).toThrow('procedencia');
});
