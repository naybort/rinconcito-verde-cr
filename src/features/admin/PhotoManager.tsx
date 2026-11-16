import { useState } from 'react';
import { Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { draftPhotos, photoId, hasPhoto, MAX_PLANT_PHOTOS, type Draft, type DraftPhoto } from '../../../functions/src/domain';
import { DraftPhotoGallery } from './DraftPhotoGallery';

export function PhotoManager({ draft, preview, uploading, progress, busy, onUpload, onChange, onEnhance }: {
 onEnhance: (id: string) => void; draft: Draft; preview: string; uploading: boolean; progress: string; busy: boolean;
 onUpload: (files: File[], replaceCover: boolean) => void; onChange: (photos: DraftPhoto[]) => void;
}) {
 const photos = draftPhotos(draft).filter(hasPhoto), blocked = busy || uploading;
 const [selectedId, setSelectedId] = useState('');
 const index = Math.max(0, photos.findIndex(photo => photoId(photo) === selectedId));
 const selected = photos[index];
 function move(from: number, to: number) { const next = [...photos]; const [photo] = next.splice(from, 1); next.splice(to, 0, photo); setSelectedId(photoId(photo)); onChange(next); }
 function remove() { const next = photos.filter((_, i) => i !== index); setSelectedId(next[Math.min(index, next.length - 1)] ? photoId(next[Math.min(index, next.length - 1)]) : ''); onChange(next); }
 return <Stack spacing={2}>
  <Typography>{photos.length}/{MAX_PLANT_PHOTOS} imágenes · La primera es la portada.</Typography>
  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, flexWrap: 'wrap' }}>
   <Button component="label" variant="outlined" disabled={blocked}>{uploading ? 'Subiendo original…' : 'Tomar o subir fotografía'}<input aria-label="Fotografía original" hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; onUpload(files, true); }}/></Button>
   <Button component="label" variant="outlined" disabled={blocked || photos.length >= MAX_PLANT_PHOTOS}>Agregar varias fotografías<input aria-label="Fotografías adicionales" hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; onUpload(files, false); }}/></Button>
  </Stack>
  {uploading && <Typography role="status">{progress}</Typography>}
  <Typography variant="body2" color="text.secondary">JPEG, PNG o WebP de hasta 10 MB. Los originales se conservan; la mejora IA es opcional para cada imagen.</Typography>
  {!selected ? <TextField label="Descripción de la fotografía" value={draft.image.alt} slotProps={{ htmlInput: { maxLength: 250 } }} onChange={e => onChange([{ image: { ...draft.image, alt: e.target.value }, originalPath: '', approvedImagePath: '' }])}/> : <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}><Stack spacing={2}>
   <DraftPhotoGallery draft={draft} preview={preview} selectedId={selectedId} onSelect={setSelectedId}/>
   <Chip label={index === 0 ? 'Portada' : `Imagen ${index + 1}`} color={index === 0 ? 'primary' : 'default'} sx={{ alignSelf: 'start' }}/>
   <TextField label={index === 0 ? 'Descripción de la fotografía' : `Descripción de la imagen ${index + 1}`} value={selected.image.alt} disabled={blocked} slotProps={{ htmlInput: { maxLength: 250 } }} onChange={e => onChange(photos.map((photo, i) => i === index ? { ...photo, image: { ...photo.image, alt: e.target.value } } : photo))}/>
   <Typography variant="body2">{selected.approvedImagePath ? 'Propuesta IA elegida' : 'Original elegido'}</Typography>
   <Button disabled={blocked} onClick={() => onEnhance(photoId(selected))}>Revisar mejora IA de imagen {index + 1}</Button>
   <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
    {index > 0 && <Button disabled={blocked} onClick={() => move(index, 0)}>Usar imagen {index + 1} como portada</Button>}
    {index > 1 && <Button disabled={blocked} onClick={() => move(index, index - 1)}>Mover imagen {index + 1} antes</Button>}
    <Button disabled={blocked} onClick={remove}>Quitar imagen {index + 1}</Button>
   </Stack>
  </Stack></Paper>}
 </Stack>;
}
