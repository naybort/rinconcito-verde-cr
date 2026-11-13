import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { draftPhotos, photoId, hasPhoto, MAX_PLANT_PHOTOS, type Draft, type DraftPhoto } from '../../../functions/src/domain';
import { PrivatePhoto } from './PrivatePhoto';
export function PhotoManager({draft,preview,uploading,progress,busy,onUpload,onChange,onEnhance}:{onEnhance:(id:string)=>void;draft:Draft;preview:string;uploading:boolean;progress:string;busy:boolean;onUpload:(files:File[],replaceCover:boolean)=>void;onChange:(photos:DraftPhoto[])=>void}){
 const photos=draftPhotos(draft).filter(hasPhoto);const blocked=busy||uploading;
 function move(from:number,to:number){const next=[...photos];const [photo]=next.splice(from,1);next.splice(to,0,photo);onChange(next);}
 return <Stack spacing={2}>
 <Typography>{photos.length}/{MAX_PLANT_PHOTOS} fotos · La primera es la portada. Las demás aparecen en el detalle de la planta.</Typography>
 <Button component="label" variant="outlined" disabled={blocked}>{uploading?'Subiendo original…':'Tomar o subir fotografía'}<input aria-label="Fotografía original" hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';onUpload(files,true);}}/></Button>
 <Button component="label" variant="outlined" disabled={blocked||photos.length>=MAX_PLANT_PHOTOS}>Agregar varias fotografías<input aria-label="Fotografías adicionales" hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';onUpload(files,false);}}/></Button>
 {uploading&&<Typography role="status">{progress}</Typography>}
 <Typography variant="body2">JPEG, PNG o WebP de hasta 10 MB por foto. El original se conserva privado; publicar crea copias públicas de las imágenes elegidas. La mejora IA es opcional e independiente para cada foto.</Typography>
 {!photos.length&&<TextField label="Descripción de la fotografía" value={draft.image.alt} slotProps={{htmlInput:{maxLength:250}}} onChange={e=>onChange([{image:{...draft.image,alt:e.target.value},originalPath:'',approvedImagePath:''}])}/>}
 {photos.map((photo,i)=><Paper key={photo.originalPath||photo.image.src} variant="outlined" sx={{p:2}}><Stack spacing={2}>
 <Chip label={i===0?'Portada':`Foto ${i+1}`} color={i===0?'primary':'default'} sx={{alignSelf:'start'}}/>
 {i===0?<Box component="img" src={(photo.originalPath?preview:photo.image.src)||undefined} alt="Vista previa de la fotografía" sx={{width:'100%',height:260,objectFit:'contain',bgcolor:'#eef3ee',borderRadius:2}}/>:photo.originalPath?<PrivatePhoto key={photo.approvedImagePath||photo.originalPath} path={photo.approvedImagePath||photo.originalPath} label={`Vista previa de la foto ${i+1}`}/>:<Box component="img" src={photo.image.src} alt={`Vista previa de la foto ${i+1}`} sx={{width:'100%',height:200,objectFit:'contain'}}/>}
 <TextField label={i===0?'Descripción de la fotografía':`Descripción de la foto ${i+1}`} value={photo.image.alt} disabled={blocked} slotProps={{htmlInput:{maxLength:250}}} onChange={e=>onChange(photos.map((p,j)=>j===i?{...p,image:{...p.image,alt:e.target.value}}:p))}/>
 <Typography variant="body2">{photo.approvedImagePath?'Propuesta IA elegida':'Original elegido'}</Typography>
 <Button disabled={blocked} onClick={()=>onEnhance(photoId(photo))}>Revisar mejora IA de foto {i+1}</Button>
 <Stack direction="row" sx={{gap:1,flexWrap:'wrap'}}>
 {i>0&&<Button disabled={blocked} onClick={()=>move(i,0)}>Usar foto {i+1} como portada</Button>}
 {i>1&&<Button disabled={blocked} onClick={()=>move(i,i-1)}>Mover foto {i+1} antes</Button>}
 <Button disabled={blocked} onClick={()=>onChange(photos.filter((_,j)=>j!==i))}>Quitar foto {i+1}</Button>
 </Stack></Stack></Paper>)}
 </Stack>;
}
