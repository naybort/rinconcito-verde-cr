import { useState } from 'react';
import { readFavorites, writeFavorites } from './storage';
export function useFavorites(validIds: string[]) {
 const [state, setState] = useState(() => {
  try { return readFavorites(window.localStorage, validIds); }
  catch { return { ids: [] as string[], warning: 'Este navegador no permite guardar favoritos. Podés seleccionarlos durante esta sesión.' }; }
 });
 function toggle(id: string) {
  if (!validIds.includes(id)) return;
  const ids = state.ids.includes(id) ? state.ids.filter(item => item !== id) : [...state.ids, id];
  let warning: string;
  try { warning = writeFavorites(window.localStorage, ids); }
  catch { warning = 'Tus favoritos se mantienen en esta sesión, pero este navegador no permite guardarlos.'; }
  setState({ ids, warning });
 }
 return { ...state, toggle };
}
