import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { getBlob, ref } from 'firebase/storage';
import { firebase } from '../../lib/firebase';

/** A private URL is valid only for the currently selected immutable Storage path. */
export function usePrivatePhoto(path?: string) {
 // A new selection also invalidates a revoked URL when returning to an earlier path.
 const selection = useMemo(() => ({ path }), [path]);
 const [loaded, setLoaded] = useState<{ selection: typeof selection; src: string }>();
 const [failed, setFailed] = useState<typeof selection>();
 useEffect(() => {
  const path = selection.path;
  if (!firebase || !path) return;
  let active = true; let url = '';
  void getBlob(ref(firebase.storage, path)).then(blob => {
   if (!active) return;
   url = URL.createObjectURL(blob); setLoaded({ selection, src: url });
  }).catch(() => { if (active) setFailed(selection); });
  return () => { active = false; if (url) URL.revokeObjectURL(url); };
 }, [selection]);
 const src = path && loaded?.selection === selection ? loaded.src : '';
 const error = !!path && failed === selection;
 return { src, error, loading: !!path && !!firebase && !src && !error };
}
export function PrivatePhoto({ path, label, height = 240 }: { path: string; label: string; height?: number | string }) {
 const { src, error, loading } = usePrivatePhoto(path);
 return error && !label ? <Typography variant="caption" sx={{ fontSize: 10 }}>Sin vista previa</Typography> : error ? <Alert severity="warning">No se pudo cargar {label.toLowerCase()}.</Alert> : src ? <Box component="img" src={src} alt={label} sx={{ width: '100%', height, objectFit: 'contain' }}/> : loading ? <Box sx={{ minHeight: height, display: 'grid', placeItems: 'center' }}><Typography variant="caption">Cargando imagen…</Typography></Box> : null;
}
