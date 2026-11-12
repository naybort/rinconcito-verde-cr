export type PlantImage = { src: string; alt: string };
export type Plant = { id: string; name: string; categoryIds: string[]; image: PlantImage; description?: string; care?: { light: string; watering: string; humidity: string; temperature: string }; detailImage?: PlantImage };
export type Category = { id: string; name: string };
export type Catalog = { plants: Plant[]; categories: Category[] };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function fail(path: string): never { throw new Error('Catálogo inválido: ' + path); }
function imageValid(value: unknown, path: string) {
 if (!record(value) || !nonempty(value.src) || !/^\/images\/[a-zA-Z0-9_-]+\.(png|webp|jpg|jpeg|svg)$/.test(value.src) || !nonempty(value.alt)) fail(path);
}
export function parseCatalog(plantData: unknown, categoryData: unknown): Catalog {
 if (!record(categoryData) || categoryData.schemaVersion !== 1 || !Array.isArray(categoryData.categories)) fail('categories.json: schemaVersion/categories');
 const categoryIds = new Set<string>();
 categoryData.categories.forEach((c: unknown, i: number) => {
  if (!record(c) || !nonempty(c.id) || !nonempty(c.name) || categoryIds.has(c.id)) fail('categories.json: categories[' + i + '].id/name');
  categoryIds.add(c.id);
 });
 if (!record(plantData) || plantData.schemaVersion !== 1 || !Array.isArray(plantData.plants)) fail('plants.json: schemaVersion/plants');
 const ids = new Set<string>();
 plantData.plants.forEach((p: unknown, i: number) => {
  const path = 'plants.json: plants[' + i + ']';
  if (!record(p) || !nonempty(p.id) || !/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id)) fail(path + '.id');
  ids.add(p.id);
  if (!nonempty(p.name)) fail(path + '.name');
  if (!Array.isArray(p.categoryIds) || !p.categoryIds.every(c => typeof c === 'string' && categoryIds.has(c)) || new Set(p.categoryIds).size !== p.categoryIds.length) fail(path + '.categoryIds');
  imageValid(p.image, path + '.image');
  if (p.detailImage !== undefined) imageValid(p.detailImage, path + '.detailImage');
  if (p.care !== undefined && (!record(p.care) || !['light', 'watering', 'humidity', 'temperature'].every(key => nonempty((p.care as Record<string, unknown>)[key])))) fail(path + '.care');
  if (p.description !== undefined && !nonempty(p.description)) fail(path + '.description');
 });
 return { plants: plantData.plants as Plant[], categories: categoryData.categories as Category[] };
}
