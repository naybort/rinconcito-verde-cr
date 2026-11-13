import { useEffect, useSyncExternalStore } from 'react';

const isAdminHash = (hash: string) => /^#\/?admin\/?$/.test(hash);
function readRoute() {
 const { pathname, hash } = window.location;
 if (/^\/admin\/?$/.test(pathname) || isAdminHash(hash)) return '#/admin';
 return hash || '#/';
}
function subscribe(onChange: () => void) {
 window.addEventListener('hashchange', onChange);
 window.addEventListener('popstate', onChange);
 return () => {
  window.removeEventListener('hashchange', onChange);
  window.removeEventListener('popstate', onChange);
 };
}
export function useRoute() {
 const route = useSyncExternalStore(subscribe, readRoute);
 useEffect(() => {
  if (route !== '#/admin') return;
  const { pathname, search, hash } = window.location;
  // Keep existing bookmarks, without adding another entry to Back/Forward.
  if (pathname !== '/admin' || isAdminHash(hash)) {
   window.history.replaceState(window.history.state, '', '/admin' + search + (isAdminHash(hash) ? '' : hash));
  }
 }, [route]);
 return route;
}
