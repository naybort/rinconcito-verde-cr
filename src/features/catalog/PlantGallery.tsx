import { useState } from 'react';
import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { PlantPhoto } from '../../shared/PlantPhoto';
import { composeBrandedPhoto } from '../../shared/brand/photoExport';
import { downloadBlob } from '../../shared/brand/identity';
import type { Plant, PlantImage } from './schema';

export function plantImages(plant: Plant): PlantImage[] {
 if (plant.images?.length) return plant.images;
 return [plant.image, ...(plant.detailImage && plant.detailImage.src !== plant.image.src ? [plant.detailImage] : [])];
}

export function PlantGallery({ plant }: { plant: Plant }) {
 const images = plantImages(plant);
 const [selected, setSelected] = useState(0);
 const [open, setOpen] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
 const index = Math.min(selected, images.length - 1);
 const image = images[index];
 const choose = (next: number) => { setSelected((next + images.length) % images.length); setError(''); };
 const onKeyDown = (event: React.KeyboardEvent) => {
  if (images.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
   event.preventDefault(); choose(index + (event.key === 'ArrowLeft' ? -1 : 1));
  }
 };
 async function download() {
  setBusy(true); setError('');
  try { downloadBlob(await composeBrandedPhoto(image.src), `${plant.id}-foto-${index + 1}-rinconcito-verde.png`); }
  catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo descargar la foto. Intentá de nuevo.'); }
  finally { setBusy(false); }
 }
 const controls = <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
  <Button aria-label="Foto anterior" disabled={images.length < 2} onClick={() => choose(index - 1)}>Anterior</Button>
  <Typography variant="body2" role="status" sx={{ textAlign: 'center' }}>Foto {index + 1} de {images.length}{index === 0 ? ' · portada' : ''}</Typography>
  <Button aria-label="Foto siguiente" disabled={images.length < 2} onClick={() => choose(index + 1)}>Siguiente</Button>
 </Stack>;
 return <Box sx={{ minWidth: 0 }}>
  <ButtonBase onClick={() => setOpen(true)} aria-label={`Ampliar foto ${index + 1} de ${plant.name}`} sx={{ display: 'block', width: '100%', borderRadius: 2, overflow: 'hidden', textAlign: 'inherit' }}>
   <PlantPhoto key={image.src} image={image} fit="contain" height={{ xs: 320, md: 460 }} eager/>
  </ButtonBase>
  <Button fullWidth onClick={() => setOpen(true)} sx={{ mt: .5 }}>Ver foto completa</Button>
  <Stack role="group" aria-label={`Fotografías de ${plant.name}`} spacing={1} onKeyDown={onKeyDown}>
   {controls}
   {images.length > 1 && <Stack direction="row" sx={{ gap: 1, overflowX: 'auto', p: .5 }}>{images.map((photo, i) => <Button key={photo.src} aria-label={`Ver foto ${i + 1}${i === 0 ? ' · portada' : ''}`} aria-pressed={index === i} onClick={() => choose(i)} sx={{ p: .5, minWidth: 72, flexShrink: 0, border: '2px solid', borderColor: index === i ? 'primary.main' : 'transparent', borderRadius: 2 }}><Box component="img" src={photo.src} alt="" loading="lazy" sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1 }}/></Button>)}</Stack>}
  </Stack>
  <Dialog open={open} onClose={() => setOpen(false)} fullScreen={mobile} fullWidth maxWidth="lg" aria-labelledby="photo-dialog-title" onKeyDown={onKeyDown}>
   <DialogTitle id="photo-dialog-title" sx={{ fontSize: 20, overflowWrap: 'anywhere' }}>{plant.name}</DialogTitle>
   <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
    <PlantPhoto key={image.src} image={image} fit="contain" height="min(60dvh, 700px)" eager/>
    <Typography variant="body2" sx={{ my: 1 }}>{image.alt}</Typography>
    {controls}
    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
   </DialogContent>
   <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 'max(16px, env(safe-area-inset-bottom))' }}>
    <Button disabled={busy} onClick={() => void download()}>{busy ? 'Preparando descarga…' : 'Descargar foto con marca'}</Button>
    <Button variant="contained" onClick={() => setOpen(false)}>Cerrar foto</Button>
   </DialogActions>
  </Dialog>
 </Box>;
}
