import { useState } from 'react';
import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Typography, useMediaQuery, useTheme } from '@mui/material';
import { draftPhotos, hasPhoto, photoId, type Draft } from '../../../functions/src/domain';
import { ImageCarousel } from '../../shared/gallery/ImageCarousel';
import { PlantPhoto } from '../../shared/PlantPhoto';
import { composeBrandedPhoto } from '../../shared/brand/photoExport';
import { downloadBlob } from '../../shared/brand/identity';
import { PrivatePhoto, usePrivatePhoto } from './PrivatePhoto';

/** Read-only gallery: all originals remain in private Storage; download adds a separate frame. */
export function DraftPhotoGallery({ draft, preview = '', selectedId, onSelect }: {
 draft: Draft; preview?: string; selectedId?: string; onSelect?: (id: string) => void;
}) {
 const photos = draftPhotos(draft).filter(hasPhoto);
 const [internal, setInternal] = useState('');
 const [open, setOpen] = useState(false);
 const [busy, setBusy] = useState(false);
 const [downloadError, setDownloadError] = useState('');
 const index = Math.max(0, photos.findIndex(photo => photoId(photo) === (selectedId ?? internal)));
 const photo = photos[index];
 const path = photo?.originalPath ? photo.approvedImagePath || photo.originalPath : undefined;
 const privateImage = usePrivatePhoto(index === 0 && preview ? undefined : path);
 const src = path ? index === 0 && preview ? preview : privateImage.src : photo?.image.src;
 const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
 const choose = (next: number) => {
  const nextId = photoId(photos[next]);
  setInternal(nextId); onSelect?.(nextId); setDownloadError('');
 };
 async function download() {
  if (!src || busy) return;
  setBusy(true); setDownloadError('');
  try { downloadBlob(await composeBrandedPhoto(src), `${draft.id}-foto-${index + 1}-rinconcito-verde.png`); }
  catch (error) { setDownloadError(error instanceof Error ? error.message : 'No se pudo preparar la descarga.'); }
  finally { setBusy(false); }
 }
 if (!photo) return <Typography color="text.secondary">Agregá una imagen para verla aquí.</Typography>;
 const image = { src: src || '', alt: index === 0 ? 'Vista previa de la fotografía' : `Vista previa de la imagen ${index + 1}` };
 const visual = (height: number | string) => src ? <PlantPhoto key={src} image={image} fit="contain" height={height} eager/> : <Box sx={{ minHeight: height, display: 'grid', placeItems: 'center', p: 2, bgcolor: '#eef3ee' }}>{privateImage.error ? <Alert severity="warning">No se pudo cargar esta imagen privada.</Alert> : <Typography color="text.secondary">Cargando imagen…</Typography>}</Box>;
 const thumbnails = photos.map((item, i) => <Box key={photoId(item)} sx={{ width: 58, height: 58, overflow: 'hidden', borderRadius: 1 }}>
  {i === index && src ? <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }}/> : item.originalPath ? <PrivatePhoto path={item.approvedImagePath || item.originalPath} label="" height={58}/> : <Box component="img" src={item.image.src} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'contain' }}/>}
 </Box>);
 return <>
  <ImageCarousel count={photos.length} index={index} onChange={choose} disabled={busy} thumbnails={thumbnails} label={`Imágenes de ${draft.name || 'la planta'}`}>
   <ButtonBase disabled={!src} onClick={() => setOpen(true)} aria-label={`Ver imagen ${index + 1}`} sx={{ width: '100%', display: 'block', textAlign: 'inherit' }}>{visual(300)}</ButtonBase>
  </ImageCarousel>
  <Button disabled={!src} onClick={() => setOpen(true)}>Ver imagen</Button>
  <Dialog open={open} onClose={() => setOpen(false)} fullScreen={mobile} fullWidth maxWidth="lg" aria-labelledby="draft-image-title">
   <DialogTitle id="draft-image-title">{draft.name || 'Imagen de la planta'}</DialogTitle>
   <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
    <ImageCarousel count={photos.length} index={index} onChange={choose} disabled={busy} label="Vista completa de las imágenes de la ficha">{visual('min(60dvh, 700px)')}</ImageCarousel>
    {photo.image.alt && <Typography sx={{ mt: 1 }}>{photo.image.alt}</Typography>}
    {downloadError && <Alert severity="error" sx={{ mt: 1 }}>{downloadError}</Alert>}
   </DialogContent>
   <DialogActions sx={{ flexWrap: 'wrap', gap: 1, p: 2 }}>
    <Button disabled={busy || !src} onClick={() => void download()}>{busy ? 'Preparando descarga…' : 'Descargar imagen'}</Button>
    <Button variant="contained" onClick={() => setOpen(false)}>Cerrar</Button>
   </DialogActions>
  </Dialog>
 </>;
}
