export const FAVORITES_KEY = 'rinconcito-verde:favorites:v1';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type FavoriteState = { ids: string[]; warning: string };
export function readFavorites(storage: StoragePort, validIds: string[]): FavoriteState {
 try {
  const raw = storage.getItem(FAVORITES_KEY);
  if (!raw) return { ids: [], warning: '' };
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('plantIds' in data) || !Array.isArray(data.plantIds) || !data.plantIds.every(id => typeof id === 'string')) throw new Error('invalid');
  return { ids: [...new Set(data.plantIds as string[])].filter(id => validIds.includes(id)), warning: '' };
 } catch { return { ids: [], warning: 'No pudimos recuperar tus favoritos. Podés iniciar una nueva selección.' }; }
}
export function writeFavorites(storage: StoragePort, ids: string[]): string {
 try { storage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, plantIds: [...new Set(ids)] })); return ''; }
 catch { return 'Tus favoritos se mantienen en esta sesión, pero este navegador no permite guardarlos.'; }
}
