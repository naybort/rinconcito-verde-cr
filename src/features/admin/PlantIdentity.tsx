import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { getBlob, ref } from 'firebase/storage';
import { firebase } from '../../lib/firebase';
import type { PlantRecord } from '../../../functions/src/domain';

type PlantSummary = Pick<PlantRecord, 'id' | 'name' | 'image' | 'originalPath' | 'approvedImagePath'>;
function Thumbnail({ plant }: { plant: PlantSummary }) {
 const path = plant.approvedImagePath || plant.originalPath;
 const [loaded, setLoaded] = useState<{ path: string; src: string; failed?: boolean }>();
 const [failedSrc, setFailedSrc] = useState('');
 useEffect(() => {
  if (!path || !firebase) return;
  let active = true, url = '';
  void getBlob(ref(firebase.storage, path)).then(blob => {
   if (!active) return;
   url = URL.createObjectURL(blob); setLoaded({ path, src: url });
  }).catch(() => { if (active) setLoaded({ path, src: '', failed: true }); });
  return () => { active = false; if (url) URL.revokeObjectURL(url); };
 }, [path]);
 const src = path ? loaded?.path === path ? loaded.src : '' : plant.image.src;
 const loading = !!path && !!firebase && loaded?.path !== path;
 return <Box sx={{ width: 56, height: 56, flexShrink: 0, bgcolor: '#eef3ee', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
  {src && src !== failedSrc ? <Box component="img" src={src} alt={`Foto de ${plant.name}`} loading="lazy" onError={() => setFailedSrc(src)} sx={{ width: '100%', height: '100%', objectFit: 'contain' }}/> : <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textAlign: 'center', px: .5 }}>{loading ? 'Cargando…' : 'Sin foto'}</Typography>}
 </Box>;
}
export function PlantIdentity({ plant }: { plant: PlantSummary }) {
 return <Stack direction="row" sx={{ gap: 1.5, minWidth: 0, alignItems: 'center', flex: 1 }}>
  <Thumbnail key={plant.id} plant={plant}/><Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{plant.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere', fontFamily: 'monospace', lineHeight: 1.5 }}>ID: {plant.id}</Typography></Box>
 </Stack>;
}
