import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getBlob, ref } from 'firebase/storage';
import { firebase } from '../../lib/firebase';
import { aiPreferencesSchema, blankDraft, draftFromRecord, draftPhotos, photoId, hasPhoto, withPhotos, MAX_PLANT_PHOTOS, type Draft, type DraftPhoto, type PlantRecord, type Taxonomy, type Stock } from '../../../functions/src/domain';
import { statusLabels } from './uiLabels';
import { PrivatePhoto } from './PrivatePhoto';
import { PhotoManager } from './PhotoManager';
import { AIAssistant } from './AIAssistant';
import { phases, phaseHints, missingForPublication, emptyInventory, type InventoryDraft } from './workflow';
import { uploadOriginalPhoto, photoUploadError } from './uploadPhoto';
import { careLabels } from './Taxonomies';
import { Inventory, type Run } from './Inventory';
import type { Job, Movement } from './state';
export type Editing={draft:Draft;revision:number;status:string;dirty:boolean;phase:number;assisted:boolean;enhancePhotoId?:string;inventory:InventoryDraft};
export function toEditing(p?:PlantRecord):Editing{return p?{draft:draftFromRecord(p),revision:p.revision,status:p.status,dirty:false,phase:0,assisted:true,inventory:emptyInventory()}:{draft:blankDraft(crypto.randomUUID()),revision:0,status:'draft',dirty:false,phase:0,assisted:true,inventory:emptyInventory()};}
export function PlantEditor({editing,setEditing,categories,templates,jobs,uid,role,run,busy,plants,stocks,movements,onLabels}:{plants:PlantRecord[];stocks:Stock[];movements:Movement[];onLabels:()=>void;editing:Editing;setEditing:(v:Editing|((previous:Editing|null)=>Editing|null))=>void;categories:Taxonomy[];templates:Taxonomy[];jobs:Job[];uid:string;role:string;run:Run;busy:boolean}){
 const {revision,status,dirty,phase=0,assisted=true}=editing;const draft={...editing.draft,ai:editing.draft.ai??aiPreferencesSchema.parse(undefined),gallery:editing.draft.gallery??[]};const [uploading,setUploading]=useState(false);const [error,setError]=useState('');const [uploadProgress,setUploadProgress]=useState('');const [previewState,setPreview]=useState<{path:string;src:string}|null>(null);const [reviewed,setReviewed]=useState(false);const lock=useRef(false);
 const photos=draftPhotos(draft).filter(hasPhoto);const enhancePhoto=photos.find(p=>photoId(p)===editing.enhancePhotoId)??draftPhotos(draft)[0];
 const selectedPhotoPath=draft.approvedImagePath||draft.originalPath;const preview=previewState?.path===selectedPhotoPath?previewState.src:'';
 const set=(patch:Partial<Draft>)=>{setReviewed(false);setEditing(previous=>previous?{...previous,draft:{...previous.draft,...patch},dirty:true}:null);};
 useEffect(()=>{if(!draft.originalPath||!firebase)return;let url='';let active=true;void getBlob(ref(firebase.storage,draft.approvedImagePath||draft.originalPath)).then(blob=>{url=URL.createObjectURL(blob);if(active)setPreview({path:draft.approvedImagePath||draft.originalPath,src:url});else URL.revokeObjectURL(url);}).catch(()=>{if(active)setError('No se pudo cargar la fotografía privada.');});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[draft.originalPath,draft.approvedImagePath]);
 function updatePhoto(id:string,patch:Partial<DraftPhoto>){setReviewed(false);setEditing(previous=>{if(!previous)return previous;const current=draftPhotos(previous.draft);if(!current.some(p=>photoId(p)===id))return previous;return {...previous,dirty:true,draft:withPhotos(previous.draft,current.map(p=>photoId(p)===id?{...p,...patch}:p))};});}
 async function upload(files:File[],replaceCover:boolean){
  if(!files.length||!firebase||lock.current)return;
  const count=draftPhotos(draft).filter(hasPhoto).length;
  if(count+files.length-(replaceCover&&count?1:0)>MAX_PLANT_PHOTOS){setError(`Podés guardar hasta ${MAX_PLANT_PHOTOS} fotografías por ficha. Quitá alguna antes de agregar más.`);return;}
  if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){setError('Usá JPEG, PNG o WebP de hasta 10 MB por fotografía. No se subió ningún archivo de esta selección.');return;}
  lock.current=true;setUploading(true);setReviewed(false);setError('');let completed=0;
  try{for(const [i,file] of files.entries()){
   setUploadProgress(`Subiendo foto ${i+1} de ${files.length}…`);
   const path=`originals/${uid}/${draft.id}/${crypto.randomUUID()}`;await uploadOriginalPhoto(firebase.storage,path,file);
   setEditing(previous=>{
    if(!previous||previous.draft.id!==draft.id)return previous;
    const photos=draftPhotos(previous.draft).filter(hasPhoto);
    const photo={originalPath:path,approvedImagePath:'',image:{src:'',alt:replaceCover&&i===0?previous.draft.image.alt:`${previous.draft.name||'Planta'} · vista adicional`}};
    if(replaceCover&&i===0&&photos.length)photos[0]=photo;else photos.push(photo);
    return {...previous,dirty:true,draft:withPhotos(previous.draft,photos)};
   });completed++;
  }}catch(error){setError(photoUploadError(error)+(completed?` Se conservaron las ${completed} fotografías que ya terminaron de subir. Seleccioná únicamente las pendientes para reintentar.`:''));}
  finally{lock.current=false;setUploading(false);setUploadProgress('');}
 }
 async function action(name:string){const data=await run(name,name==='savePlant'?{draft,revision}:{id:draft.id,revision}) as {plant?:PlantRecord}|undefined;if(data?.plant){setReviewed(false);setEditing(previous=>previous&&previous.draft.id===draft.id?{...toEditing(data.plant),phase:previous.phase??0,assisted:previous.assisted??true,enhancePhotoId:previous.enhancePhotoId,inventory:previous.inventory??emptyInventory()}:previous);}}

 const canSave=!busy&&!uploading&&!!draft.name.trim()&&status!=='archived'&&(dirty||revision===0);
 const aiNextStep=(originalPath:string)=>status==='archived'?'Restaurá la ficha antes de solicitar sugerencias de IA.':uploading?'Esperá a que termine de subir la fotografía.':!originalPath?'Subí una fotografía original y guardá el borrador para habilitar la IA.':!draft.name.trim()?'Escribí un nombre orientativo y guardá el borrador para habilitar la IA.':dirty||!revision?'La foto o los datos tienen cambios sin guardar. Guardá el borrador para habilitar las sugerencias de IA. Guardar no publica la ficha.':busy?'Esperá a que termine la operación actual.':'';
 const missing=missingForPublication(draft);
 const publicationNextStep=busy?'Esperá a que termine la operación actual.':uploading?'Esperá a que termine la subida y guardá la fotografía antes de enviar a revisión.':status==='archived'?'La ficha está archivada. Restaurala para volver a revisarla.':dirty||!revision?'Guardá el borrador y después pulsá «Enviar a revisión».':status==='draft'?'La ficha está en borrador. Pulsá «Enviar a revisión»; después confirmá la revisión para habilitar «Publicar ficha».':status==='published'?'Esta ficha ya está publicada. Si la editás, guardá y enviá los cambios a una nueva revisión.':role!=='admin'?'La ficha está en revisión. Una persona con rol de administrador puede publicarla.':missing.length?'Completá los campos pendientes indicados arriba antes de confirmar la revisión.':!reviewed?'La ficha está en revisión. Marcá la casilla «Revisé identificación, cuidados, fuentes y fotografía» para habilitar «Publicar ficha».':'Revisión confirmada. Pulsá «Publicar ficha» para hacer visible esta versión en el catálogo.';
 const go=(target:number)=>{setEditing(previous=>previous?{...previous,phase:target}:previous);window.scrollTo({top:0,behavior:'instant'});};
 const ai=(kind:'identify'|'content'|'enhance',photo?:DraftPhoto)=>{
  const originalPath=photo?.originalPath??draft.originalPath;
  return !assisted?<Button variant="outlined" onClick={()=>setEditing(previous=>previous?{...previous,assisted:true}:previous)}>Mostrar asistencia IA opcional</Button>:<AIAssistant key={kind+(photo?photoId(photo):'')} photo={photo} onPhotoChange={patch=>updatePhoto(photoId(photo??draftPhotos(draft)[0]),patch)} kind={kind} draft={draft} revision={revision} dirty={dirty} busy={busy||uploading} blocked={busy||uploading||dirty||!revision||!originalPath||status==='archived'} nextStep={aiNextStep(originalPath)} canSave={canSave} save={()=>void action('savePlant')} jobs={jobs} run={run} set={set}/>;
 };
 return <Stack spacing={2}>
 <Stack direction={{xs:'column',sm:'row'}} sx={{justifyContent:'space-between'}} spacing={1}><Box><Typography component="h1" variant="h2">{revision?'Editar ficha':'Agregar planta'}</Typography><Typography color="text.secondary">{draft.name||'Nueva ficha del catálogo'}</Typography></Box><Stack direction="row" sx={{gap:1,flexWrap:'wrap'}}><Chip label={statusLabels[status]}/><Chip label={`Versión ${revision}`}/><Chip label={dirty?'Cambios sin guardar':revision?'Guardado':'Borrador local'} color={dirty?'warning':'default'}/></Stack></Stack>
 <Paper variant="outlined" sx={{p:2}}><Stack spacing={2}>
 <Typography variant="body2">Paso {phase+1} de 7 · Podés ir directamente a cualquier paso</Typography><LinearProgress variant="determinate" value={(phase+1)/7*100} aria-label="Posición en el flujo"/>
 <TextField select label="Ir al paso" value={phase} onChange={e=>go(Number(e.target.value))} sx={{display:{xs:'block',md:'none'}}}>{phases.map((label,i)=><MenuItem key={label} value={i}>{i+1}. {label}</MenuItem>)}</TextField>
 <Box component="nav" aria-label="Pasos de la ficha" sx={{display:{xs:'none',md:'grid'},gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:1}}>{phases.map((label,i)=><Button key={label} aria-current={phase===i?'step':undefined} variant={phase===i?'contained':'text'} onClick={()=>go(i)} sx={{display:'flex',flexDirection:'column',fontSize:12,lineHeight:1.4}}><Box component="span" sx={{fontWeight:700}}>{i+1}</Box>{label}</Button>)}</Box>
 </Stack></Paper>
 {error&&<Alert severity="error" onClose={()=>setError('')}>{error}</Alert>}
 <Stack component="fieldset" disabled={busy} spacing={2} sx={{border:0,p:0,m:0,minWidth:0}}>
 <Box><Typography component="h2" variant="h3">{phase+1}. {phases[phase]}</Typography><Typography color="text.secondary" sx={{mt:1}}>{phaseHints[phase]}</Typography></Box>
 {phase===0&&<>
 <TextField label="Nombre de la planta" required value={draft.name} onChange={e=>set({name:e.target.value})}/>
 <PhotoManager onEnhance={id=>{setEditing(previous=>previous?{...previous,enhancePhotoId:id,assisted:true,phase:4}:previous);window.scrollTo({top:0,behavior:'instant'});}} draft={draft} preview={preview} uploading={uploading} progress={uploadProgress} busy={busy} onUpload={(files,replaceCover)=>void upload(files,replaceCover)} onChange={photos=>set(withPhotos(draft,photos))}/>

 </>}
 {phase===1&&<Paper variant="outlined" sx={{p:3}}><Stack spacing={2}><Typography>Siempre podés ingresar los datos manualmente, incluso si la IA no está disponible.</Typography><Button variant="contained" onClick={()=>{setEditing(previous=>previous?{...previous,assisted:false}:previous);go(3);}}>Completar manualmente</Button><Button variant="outlined" onClick={()=>{setEditing(previous=>previous?{...previous,assisted:true}:previous);go(2);}}>Continuar con asistencia IA</Button><Alert severity="info">La asistencia envía la foto y tus instrucciones a OpenAI. Cada solicitud es explícita y puede tener coste; la revisión humana es obligatoria.</Alert></Stack></Paper>}
 {phase===2&&<><TextField label="Identificación confirmada por una persona" value={draft.ai.confirmedName} helperText="Confirmá o corregí el nombre para habilitar contenido con fuentes. Se guarda en el borrador." slotProps={{htmlInput:{maxLength:120}}} onChange={e=>set({ai:{...draft.ai,confirmedName:e.target.value}})}/>{ai('identify')}</>}
 {phase===3&&<>
 {ai('content')}
 <TextField label="Descripción" multiline minRows={3} value={draft.description} onChange={e=>set({description:e.target.value})}/>
 <Box><Typography component="h2" variant="h3">Categorías</Typography>{categories.filter(c=>c.active||draft.categoryIds.includes(c.id)).map(c=><FormControlLabel key={c.id} label={`${c.name}${c.active?'':' (archivada)'}`} control={<Checkbox checked={draft.categoryIds.includes(c.id)} onChange={()=>set({categoryIds:draft.categoryIds.includes(c.id)?draft.categoryIds.filter(id=>id!==c.id):[...draft.categoryIds,c.id]})}/>}/>)}</Box>
 <TextField select label="Plantilla de cuidados" value={draft.careTemplateId} onChange={e=>set({careTemplateId:e.target.value})}><MenuItem value="">Personalizados</MenuItem>{templates.filter(t=>t.active||t.id===draft.careTemplateId).map(t=><MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}</TextField>
 <Button disabled={!draft.careTemplateId} onClick={()=>{const t=templates.find(t=>t.id===draft.careTemplateId);if(t?.care)set({care:t.care,sources:t.sources??[]});}}>Aplicar plantilla al borrador</Button>
 {Object.entries(careLabels).map(([key,label])=><TextField key={key} label={label} multiline value={draft.care[key as keyof typeof careLabels]} onChange={e=>set({care:{...draft.care,[key]:e.target.value}})}/>)}
 <TextField label="Advertencias verificadas" multiline value={draft.warnings} onChange={e=>set({warnings:e.target.value})}/>
 <Typography component="h2" variant="h3">Fuentes</Typography>
 {draft.sources.map((source,i)=><Stack key={i} spacing={1}><TextField label={`Título fuente ${i+1}`} value={source.title} onChange={e=>set({sources:draft.sources.map((s,j)=>j===i?{...s,title:e.target.value}:s)})}/><TextField label={`URL fuente ${i+1}`} value={source.url} onChange={e=>set({sources:draft.sources.map((s,j)=>j===i?{...s,url:e.target.value}:s)})}/><TextField label={`Fecha de consulta ${i+1}`} type="date" value={source.accessedAt} onChange={e=>set({sources:draft.sources.map((s,j)=>j===i?{...s,accessedAt:e.target.value}:s)})}/><Button onClick={()=>set({sources:draft.sources.filter((_,j)=>j!==i)})}>Quitar fuente {i+1}</Button></Stack>)}
 <Button onClick={()=>set({sources:[...draft.sources,{title:'',url:'',accessedAt:new Date().toISOString().slice(0,10)}]})}>Agregar fuente</Button>
 </>}
 {phase===4&&<>
 <Alert severity="info">La IA puede alterar detalles reales. Compará hojas, tamaño, flores y condición de la planta; descartá la propuesta si algo cambió. El original siempre se conserva.</Alert>
 <Typography>Podés usar originales en todas las fotos o mejorar solo las que elijás. Seleccionar una foto no genera ni aplica IA.</Typography>
 {photos.length>0&&<TextField select label="Fotografía para mejorar" value={photoId(enhancePhoto)} onChange={e=>setEditing(previous=>previous?{...previous,enhancePhotoId:e.target.value}:previous)}>{photos.map((p,i)=><MenuItem key={photoId(p)} value={photoId(p)}>{`Foto ${i+1}${i===0?' · Portada':''} · ${p.approvedImagePath?'Propuesta IA':'Original'}`}</MenuItem>)}</TextField>}
 {enhancePhoto.originalPath?<PrivatePhoto key={enhancePhoto.approvedImagePath||enhancePhoto.originalPath} path={enhancePhoto.approvedImagePath||enhancePhoto.originalPath} label="Fotografía elegida para publicar"/>:enhancePhoto.image.src&&<Box component="img" src={enhancePhoto.image.src} alt="Fotografía elegida para publicar" sx={{width:'100%',maxHeight:320,objectFit:'contain',borderRadius:2}}/>}
 <Typography>{enhancePhoto.approvedImagePath?'Fotografía elegida: propuesta revisada':'Fotografía elegida: original'}</Typography>
 {enhancePhoto.approvedImagePath&&<Button onClick={()=>updatePhoto(photoId(enhancePhoto),{approvedImagePath:''})}>Volver a elegir el original</Button>}
 {ai('enhance',enhancePhoto)}
 </>}
 {phase===5&&(revision&&status!=='archived'?<><Alert severity="info">El inventario se guarda por separado del borrador. Guardar cantidades no publica la ficha.</Alert><Inventory scopedPlantId={draft.id} plants={plants} stocks={stocks} movements={movements} run={run} busy={busy} draft={editing.inventory??emptyInventory()} onChange={inventory=>setEditing(previous=>previous?{...previous,inventory}:previous)}/></>:<Alert severity="info">Guardá primero la ficha para registrar existencias. Si está archivada, restaurala desde revisión.</Alert>)}
 {phase===6&&<>
 <Typography variant="body2" sx={{overflowWrap:'anywhere'}}>ID permanente: {draft.id}. Todas las macetas de este tipo comparten su QR.</Typography>
 {missing.length>0?<Alert severity="warning">Falta completar: {missing.join(', ')}.</Alert>:<Alert severity="success">Los campos requeridos están completos. Verificá la exactitud de los datos y las fuentes antes de publicar.</Alert>}
 <TextField label="Notas privadas" multiline value={draft.notes} onChange={e=>set({notes:e.target.value})}/>
 <Paper variant="outlined" sx={{p:2}}><Typography component="h2" variant="h3">Vista previa pública</Typography><Typography variant="h3">{draft.name}</Typography>{(preview||draft.image.src)&&<Box component="img" src={preview||draft.image.src} alt={draft.image.alt} sx={{width:'100%',maxHeight:260,objectFit:'contain'}}/>}<Typography variant="body2">{draftPhotos(draft).filter(hasPhoto).length} fotos en el detalle público · la primera es portada</Typography><Typography>{draft.description}</Typography>{Object.entries(draft.care).map(([k,v])=><Typography key={k}><strong>{careLabels[k as keyof typeof careLabels]}:</strong> {v}</Typography>)}<Typography>{draft.warnings}</Typography>{draft.sources.map((source,i)=><Typography key={i} variant="body2">{source.title} · {source.accessedAt}</Typography>)}</Paper>
 <Alert id="publication-next-step" severity="info">{publicationNextStep}</Alert>
 <Stack direction={{xs:'column',sm:'row'}} spacing={1}><Button variant="contained" disabled={busy||uploading||dirty||status!=='draft'||!revision} onClick={()=>void action('review')}>Enviar a revisión</Button></Stack>
 {role==='admin'&&<><FormControlLabel label="Revisé identificación, cuidados, fuentes y fotografía" control={<Checkbox disabled={busy||uploading||dirty||status!=='review'||missing.length>0} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>}/><Button variant="contained" aria-describedby="publication-next-step" disabled={busy||uploading||dirty||status!=='review'||!reviewed||missing.length>0} onClick={()=>void action('publish')}>Publicar ficha</Button><Button disabled={busy||uploading||dirty||!revision} onClick={()=>void action(status==='archived'?'restore':'archive')}>{status==='archived'?'Restaurar borrador':'Archivar ficha'}</Button></>}
 {status==='published'&&<Button variant="outlined" onClick={onLabels}>Preparar etiquetas QR</Button>}
 </>}
 </Stack>
 <Paper elevation={2} sx={{position:'sticky',bottom:0,p:{xs:1,sm:2},zIndex:2,border:'1px solid',borderColor:'divider'}}><Stack spacing={1}>
 <Typography variant="caption" role="status">{uploading?'Subiendo original…':busy?'Guardando operación…':dirty?'Tus cambios se recuperan en este navegador. Guardá para sincronizarlos.':'Guardar no publica ni solicita IA.'}</Typography>
 <Stack direction="row" sx={{gap:1,display:{xs:'grid',sm:'flex'},gridTemplateColumns:'minmax(0,1fr) minmax(0,1.8fr) minmax(0,1fr)','& .MuiButton-root':{minWidth:0,px:1,fontSize:{xs:12,sm:14}}}}><Button disabled={phase===0||busy} onClick={()=>go(phase-1)}>Anterior</Button><Button variant="contained" disabled={!canSave} onClick={()=>void action('savePlant')}>Guardar borrador</Button><Button disabled={phase===6||busy} onClick={()=>go(phase+1)}>Siguiente</Button></Stack>
 </Stack></Paper>
 </Stack>;
}
