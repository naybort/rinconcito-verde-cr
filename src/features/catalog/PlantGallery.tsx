import { useState } from 'react';
import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Typography, useMediaQuery, useTheme } from '@mui/material';
import { PlantPhoto } from '../../shared/PlantPhoto';
import { ImageCarousel } from '../../shared/gallery/ImageCarousel';
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
 const choose = (next: number) => { setSelected(next); setError(''); };
 async function download() {
  setBusy(true); setError('');
  try { downloadBlob(await composeBrandedPhoto(image.src), `${plant.id}-foto-${index + 1}-rinconcito-verde.png`); }
  catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo descargar la imagen. Intentá de nuevo.'); }
  finally { setBusy(false); }
 }
 const thumbnailImages = images.map(photo => <Box component="img" src={photo.src} alt="" loading="lazy" sx={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 1 }}/>);
 return <Box sx={{ minWidth: 0 }}>
  <ImageCarousel count={images.length} index={index} onChange={choose} disabled={busy} thumbnails={thumbnailImages} label={`Imágenes de ${plant.name}`}>
   <ButtonBase onClick={() => setOpen(true)} aria-label={`Ver imagen ${index + 1} de ${plant.name}`} sx={{ display: 'block', width: '100%', textAlign: 'inherit' }}>
    <PlantPhoto key={image.src} image={image} fit="contain" height={{ xs: 320, md: 460 }} eager/>
   </ButtonBase>
  </ImageCarousel>
  <Button fullWidth onClick={() => setOpen(true)}>Ver imagen</Button>
  <Dialog open={open} onClose={() => setOpen(false)} fullScreen={mobile} fullWidth maxWidth="lg" aria-labelledby="photo-dialog-title">
   <DialogTitle id="photo-dialog-title" sx={{ fontSize: 20, overflowWrap: 'anywhere' }}>{plant.name}</DialogTitle>
   <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
    <ImageCarousel count={images.length} index={index} onChange={choose} disabled={busy} label={`Vista completa de ${plant.name}`}>
     <PlantPhoto key={image.src} image={image} fit="contain" height="min(60dvh, 700px)" eager/>
    </ImageCarousel>
    <Typography variant="body2" sx={{ my: 1 }}>{image.alt}</Typography>
    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
   </DialogContent>
   <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 'max(16px, env(safe-area-inset-bottom))' }}>
    <Button disabled={busy} onClick={() => void download()}>{busy ? 'Preparando descarga…' : 'Descargar imagen'}</Button>
    <Button variant="contained" onClick={() => setOpen(false)}>Cerrar</Button>
   </DialogActions>
  </Dialog>
 </Box>;
}
