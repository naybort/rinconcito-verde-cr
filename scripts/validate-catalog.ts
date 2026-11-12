import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCatalog } from '../src/features/catalog/schema.ts';
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const catalog = parseCatalog(read('src/data/plants.json'), read('src/data/categories.json'));
for (const plant of catalog.plants) {
 for (const image of [plant.image, plant.detailImage].filter(Boolean)) {
  if (!image || !statSync(resolve('public', '.' + image.src)).size) throw new Error('Imagen vacía: ' + image?.src);
 }
}
console.log('Catálogo válido: ' + catalog.plants.length + ' plantas, ' + catalog.categories.length + ' categorías; imágenes locales presentes.');
