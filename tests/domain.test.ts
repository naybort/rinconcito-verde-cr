import { describe, it, expect } from 'vitest';
import plants from '../src/data/plants.json';
import categories from '../src/data/categories.json';
import { parseCatalog } from '../src/features/catalog/schema';
import { FAVORITES_KEY, readFavorites, writeFavorites } from '../src/features/favorites/storage';
import { buildMessage, buildWhatsAppLink } from '../src/features/contact/whatsapp';
describe('CAT: contrato', () => {
 it('acepta el catálogo demo y uno vacío', () => {
  expect(parseCatalog(plants, categories).plants).toHaveLength(3);
  expect(parseCatalog({ schemaVersion: 1, plants: [] }, categories).plants).toEqual([]);
 });
 it.each(['id', 'category', 'name', 'image', 'path', 'version'])('rechaza %s inválido con campo identificable', field => {
  const data = structuredClone(plants);
  if (field === 'id') data.plants[1].id = data.plants[0].id;
  if (field === 'category') data.plants[0].categoryIds = ['inexistente'];
  if (field === 'name') data.plants[0].name = ' ';
  if (field === 'image') data.plants[0].image.alt = '';
  if (field === 'path') data.plants[0].image.src = '/../privado.png';
  if (field === 'version') data.schemaVersion = 2;
  expect(() => parseCatalog(data, categories)).toThrow(/plants.json/);
 });
 it('rechaza categorías duplicadas', () => expect(() => parseCatalog(plants, { schemaVersion: 1, categories: [categories.categories[0], categories.categories[0]] })).toThrow(/categories.json/));
});
describe('FAV: persistencia defensiva', () => {
 it('restaura IDs únicos vigentes', () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, plantIds: ['a','a','retirada'] }));
  expect(readFavorites(localStorage, ['a']).ids).toEqual(['a']);
 });
 it.each(['{oops', '{"version":2,"plantIds":["a"]}', '{"version":1,"plantIds":[42]}'])('recupera corrupción sin lanzar errores: %s', raw => {
  localStorage.setItem(FAVORITES_KEY, raw);
  expect(readFavorites(localStorage, ['a'])).toMatchObject({ ids: [], warning: expect.any(String) });
 });
 it('tolera lectura y escritura bloqueadas', () => {
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  expect(readFavorites(denied, ['a']).ids).toEqual([]);
  expect(writeFavorites(denied, ['a'])).toMatch(/sesión/);
 });
 it('persiste versión e IDs sin copias de productos', () => {
  expect(writeFavorites(localStorage, ['a','a'])).toBe('');
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual({ version: 1, plantIds: ['a'] });
 });
});
describe('WA: consulta explícita', () => {
 it('incluye nombre e ID una vez y preserva caracteres', () => {
  const special = { ...plants.plants[0], name: 'Árbol & café + ¿sí?' };
  const message = buildMessage([special, special, plants.plants[1]], 'Hola:');
  expect(message.split(special.id)).toHaveLength(2);
  const result = buildWhatsAppLink('12345678900', message);
  const url = new URL(result.href!);
  expect(url.origin).toBe('https://wa.me');
  expect(url.searchParams.get('text')).toBe(message);
  expect(message).toContain(plants.plants[1].id);
 });
 it.each(['', '+506 123', 'javascript:alert(1)', '012345678'])('no crea destino para número inválido %s', number => expect(buildWhatsAppLink(number, 'Hola').href).toBeNull());
 it('no crea consulta vacía ni trunca mensajes largos', () => {
  expect(buildMessage([], 'Hola')).toBe('');
  expect(buildWhatsAppLink('12345678900', '').href).toBeNull();
  expect(buildWhatsAppLink('12345678900', 'Á'.repeat(2000))).toMatchObject({ href: null, reason: expect.stringContaining('extensa') });
 });
});
