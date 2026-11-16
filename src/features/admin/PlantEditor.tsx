import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getBlob, ref } from 'firebase/storage';
import { firebase } from '../../lib/firebase';
import { aiPreferencesSchema, blankDraft, draftFromRecord, draftPhotos, photoId, hasPhoto, withPhotos, MAX_PLANT_PHOTOS, type Draft, type DraftPhoto, type PlantRecord, type Taxonomy, type Stock } from '../../../functions/src/domain';
import { statusLabels } from './uiLabels';
import { PrivatePhoto } from './PrivatePhoto';
import { PhotoManager } from './PhotoManager';
import { DraftPhotoGallery } from './DraftPhotoGallery';
import { AIAssistant } from './AIAssistant';
import { CategoryInlineEditor, type CategoryEditing } from './CategoryInlineEditor';
import { FLOW_VERSION, phases, phaseHints, missingForPublication, emptyInventory, type InventoryDraft } from './workflow';
import { uploadOriginalPhoto, photoUploadError } from './uploadPhoto';
import { careLabels } from './Taxonomies';
import { Inventory, type Run } from './Inventory';
import type { Job, Movement } from './state';

export type Editing={draft:Draft;revision:number;status:string;dirty:boolean;phase:number;flowVersion:typeof FLOW_VERSION;assisted:boolean;enhancePhotoId?:string;inventory:InventoryDraft};
export function toEditing(p?:PlantRecord):Editing {
 return p?{draft:draftFromRecord(p),revision:p.revision,status:p.status,dirty:false,phase:0,flowVersion:FLOW_VERSION,assisted:true,inventory:emptyInventory()}:{draft:blankDraft(crypto.randomUUID()),revision:0,status:'draft',dirty:false,phase:0,flowVersion:FLOW_VERSION,assisted:true,inventory:emptyInventory()};
}
export function PlantEditor({editing,setEditing,categories,templates,jobs,uid,role,run,busy,plants,stocks,movements,onLabels}:{plants:PlantRecord[];stocks:Stock[];movements:Movement[];onLabels:()=>void;editing:Editing;setEditing:(v:Editing|((previous:Editing|null)=>Editing|null))=>void;categories:Taxonomy[];templates:Taxonomy[];jobs:Job[];uid:string;role:string;run:Run;busy:boolean}) {
 const {revision,status,dirty}=editing;
 const phase=Math.max(0,Math.min(phases.length-1,editing.phase??0));
 const draft={...editing.draft,ai:editing.draft.ai??aiPreferencesSchema.parse(undefined),gallery:editing.draft.gallery??[]};
 const [uploading,setUploading]=useState(false),[error,setError]=useState(''),[uploadProgress,setUploadProgress]=useState('');
 const [previewState,setPreview]=useState<{path:string;src:string}|null>(null),[reviewed,setReviewed]=useState(false);
 const [categoryEditing,setCategoryEditing]=useState<CategoryEditing|null>(null),[savedCategories,setSavedCategories]=useState<Taxonomy[]>([]);
 const lock=useRef(false),enhancement=useRef<HTMLDivElement>(null);
 const categoryMap=new Map(categories.map(category=>[category.id,category]));
 for(const saved of savedCategories)if(!categoryMap.has(saved.id)||categoryMap.get(saved.id)!.revision<saved.revision)categoryMap.set(saved.id,saved);
 const knownCategories=[...categoryMap.values()];
 const photos=draftPhotos(draft).filter(hasPhoto),enhancePhoto=photos.find(photo=>photoId(photo)===editing.enhancePhotoId)??draftPhotos(draft)[0];
 const selectedPhotoPath=draft.approvedImagePath||draft.originalPath,preview=previewState?.path===selectedPhotoPath?previewState.src:'';
 const set=(patch:Partial<Draft>)=>{setReviewed(false);setEditing(previous=>previous?{...previous,draft:{...previous.draft,...patch},dirty:true}:null);};
 useEffect(()=>{
  if(!draft.originalPath||!firebase)return;
  let url='',active=true;
  void getBlob(ref(firebase.storage,draft.approvedImagePath||draft.originalPath)).then(blob=>{url=URL.createObjectURL(blob);if(active)setPreview({path:draft.approvedImagePath||draft.originalPath,src:url});else URL.revokeObjectURL(url);}).catch(()=>{if(active)setError('No se pudo cargar la imagen privada.');});
  return()=>{active=false;if(url)URL.revokeObjectURL(url);};
 },[draft.originalPath,draft.approvedImagePath]);
 function updatePhoto(id:string,patch:Partial<DraftPhoto>) {
  setReviewed(false);setEditing(previous=>{if(!previous)return previous;const current=draftPhotos(previous.draft);if(!current.some(photo=>photoId(photo)===id))return previous;return {...previous,dirty:true,draft:withPhotos(previous.draft,current.map(photo=>photoId(photo)===id?{...photo,...patch}:photo))};});
 }
 async function upload(files:File[],replaceCover:boolean) {
  if(!files.length||!firebase||lock.current)return;
  const count=draftPhotos(draft).filter(hasPhoto).length;
  if(count+files.length-(replaceCover&&count?1:0)>MAX_PLANT_PHOTOS){setError(`Podés guardar hasta ${MAX_PLANT_PHOTOS} imágenes por ficha. Quitá alguna antes de agregar más.`);return;}
  if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){setError('Usá JPEG, PNG o WebP de hasta 10 MB por imagen. No se subió ningún archivo de esta selección.');return;}
  lock.current=true;setUploading(true);setReviewed(false);setError('');let completed=0;
  try{for(const [i,file] of files.entries()){
   setUploadProgress(`Subiendo imagen ${i+1} de ${files.length}…`);
   const path=`originals/${uid}/${draft.id}/${crypto.randomUUID()}`;await uploadOriginalPhoto(firebase.storage,path,file);
   setEditing(previous=>{
    if(!previous||previous.draft.id!==draft.id)return previous;
    const current=draftPhotos(previous.draft).filter(hasPhoto);
    const photo={originalPath:path,approvedImagePath:'',image:{src:'',alt:replaceCover&&i===0?previous.draft.image.alt:`${previous.draft.name||'Planta'} · vista adicional`}};
    if(replaceCover&&i===0&&current.length)current[0]=photo;else current.push(photo);
    return {...previous,dirty:true,draft:withPhotos(previous.draft,current)};
   });completed++;
  }}catch(uploadError){setError(photoUploadError(uploadError)+(completed?` Se conservaron las ${completed} imágenes que ya terminaron de subir. Seleccioná únicamente las pendientes para reintentar.`:''));}
  finally{lock.current=false;setUploading(false);setUploadProgress('');}
 }
 async function action(name:string) {
  const data=await run(name,name==='savePlant'?{draft,revision}:{id:draft.id,revision}) as {plant?:PlantRecord}|undefined;
  if(data?.plant){setReviewed(false);setEditing(previous=>previous&&previous.draft.id===draft.id?{...toEditing(data.plant),phase:previous.phase??0,enhancePhotoId:previous.enhancePhotoId,inventory:previous.inventory??emptyInventory()}:previous);}
 }
 const canSave=!busy&&!uploading&&!!draft.name.trim()&&status!=='archived'&&(dirty||revision===0);
 const aiNextStep=status==='archived'?'Restaurá la ficha antes de solicitar sugerencias de IA.':uploading?'Esperá a que termine de subir la imagen.':!draft.name.trim()?'Escribí un nombre orientativo y guardá el borrador para habilitar la IA.':dirty||!revision?'Guardá los cambios del borrador para solicitar una propuesta. Guardar no publica ni inicia IA.':busy?'Esperá a que termine la operación actual.':'';
 const missing=missingForPublication(draft);
 const publicationNextStep=busy?'Esperá a que termine la operación actual.':uploading?'Esperá a que termine la subida y guardá la imagen antes de enviar a revisión.':status==='archived'?'La ficha está archivada. Restaurala para volver a revisarla.':dirty||!revision?'Guardá el borrador y después pulsá «Enviar a revisión».':status==='draft'?'La ficha está en borrador. Pulsá «Enviar a revisión»; después confirmá la revisión para habilitar «Publicar ficha».':status==='published'?'Esta ficha ya está publicada. Si la editás, guardá y enviá los cambios a una nueva revisión.':role!=='admin'?'La ficha está en revisión. Una persona con rol de administrador puede publicarla.':missing.length?'Completá los campos pendientes indicados arriba antes de confirmar la revisión.':!reviewed?'La ficha está en revisión. Marcá la casilla «Revisé identificación, cuidados, fuentes y fotografía» para habilitar «Publicar ficha».':'Revisión confirmada. Pulsá «Publicar ficha» para hacer visible esta versión en el catálogo.';
 const go=(target:number)=>{setEditing(previous=>previous?{...previous,phase:Math.max(0,Math.min(phases.length-1,target)),flowVersion:FLOW_VERSION}:previous);window.scrollTo({top:0,behavior:'instant'});};
 function createCategory(name='') {setCategoryEditing({id:crypto.randomUUID(),name,active:true,revision:0,isNew:true});}
 function categorySaved(category:Taxonomy) {
  const shouldSelect=categoryEditing?.isNew&&category.active;
  setSavedCategories(previous=>[...previous.filter(item=>item.id!==category.id),category]);setCategoryEditing(null);
  if(shouldSelect&&!draft.categoryIds.includes(category.id))set({categoryIds:[...draft.categoryIds,category.id]});
 }
 const ai=(kind:'identify'|'content'|'enhance',photo?:DraftPhoto)=><AIAssistant key={kind+(photo?photoId(photo):'')} photo={photo} onPhotoChange={patch=>updatePhoto(photoId(photo??draftPhotos(draft)[0]),patch)} kind={kind} draft={draft} revision={revision} dirty={dirty} busy={busy||uploading} blocked={busy||uploading||dirty||!revision||status==='archived'||(kind==='enhance'&&!photo?.originalPath)} nextStep={aiNextStep} canSave={canSave} save={()=>void action('savePlant')} jobs={jobs} run={run} set={set} categories={knownCategories} onCreateCategory={role==='admin'?createCategory:undefined}/>;
 const editSource=(index:number,patch:Partial<Draft['sources'][number]>)=>set({sources:draft.sources.map((source,i)=>i===index?{...source,...patch,verification:'unverified'}:source)});
 return <Stack spacing={2}>
  <Stack direction={{xs:'column',sm:'row'}} sx={{justifyContent:'space-between'}} spacing={1}><Box><Typography component="h1" variant="h2">{revision?'Editar ficha':'Agregar planta'}</Typography><Typography color="text.secondary">{draft.name||'Nueva ficha del catálogo'}</Typography></Box><Stack direction="row" sx={{gap:1,flexWrap:'wrap'}}><Chip label={statusLabels[status]}/><Chip label={`Versión ${revision}`}/><Chip label={dirty?'Cambios sin guardar':revision?'Guardado':'Borrador local'} color={dirty?'warning':'default'}/></Stack></Stack>
  <Paper variant="outlined" sx={{p:2}}><Stack spacing={2}>
   <Typography variant="body2">Sección {phase+1} de {phases.length} · Podés volver sin perder lo escrito</Typography><LinearProgress variant="determinate" value={(phase+1)/phases.length*100} aria-label="Posición en el flujo"/>
   <TextField select label="Ir a la sección" value={phase} onChange={event=>go(Number(event.target.value))} sx={{display:{xs:'block',md:'none'}}}>{phases.map((label,i)=><MenuItem key={label} value={i}>{i+1}. {label}</MenuItem>)}</TextField>
   <Box component="nav" aria-label="Secciones de la ficha" sx={{display:{xs:'none',md:'grid'},gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:1}}>{phases.map((label,i)=><Button key={label} aria-current={phase===i?'step':undefined} variant={phase===i?'contained':'text'} onClick={()=>go(i)} sx={{lineHeight:1.4}}>{i+1}. {label}</Button>)}</Box>
  </Stack></Paper>
  {error&&<Alert severity="error" onClose={()=>setError('')}>{error}</Alert>}
  <Stack component="fieldset" disabled={busy} spacing={3} sx={{border:0,p:0,m:0,minWidth:0}}>
   <Box><Typography component="h2" variant="h3">{phase+1}. {phases[phase]}</Typography><Typography color="text.secondary" sx={{mt:1}}>{phaseHints[phase]}</Typography></Box>
   {phase===0&&<>
    <Paper component="section" aria-labelledby="plant-basics-title" variant="outlined" sx={{p:{xs:2,sm:3}}}><Stack spacing={2}>
     <Typography id="plant-basics-title" component="h3" variant="h3">Nombre e imágenes</Typography>
     <TextField label="Nombre de la planta" required value={draft.name} onChange={event=>set({name:event.target.value})}/>
     <PhotoManager onEnhance={id=>{setEditing(previous=>previous?{...previous,enhancePhotoId:id}:previous);requestAnimationFrame(()=>enhancement.current?.scrollIntoView({block:'start'}));}} draft={draft} preview={preview} uploading={uploading} progress={uploadProgress} busy={busy} onUpload={(files,replaceCover)=>void upload(files,replaceCover)} onChange={next=>set(withPhotos(draft,next))}/>
     <TextField label="Identificación confirmada por una persona" value={draft.ai.confirmedName} helperText="Confirmá o corregí la identificación antes de pedir cuidados. También podés completar todos los campos manualmente." slotProps={{htmlInput:{maxLength:120}}} onChange={event=>set({ai:{...draft.ai,confirmedName:event.target.value}})}/>
    </Stack></Paper>
    {ai('identify')}
    <Paper component="section" aria-labelledby="plant-content-title" variant="outlined" sx={{p:{xs:2,sm:3}}}><Stack spacing={2}>
     <Typography id="plant-content-title" component="h3" variant="h3">Descripción, categorías y cuidados</Typography>
     <TextField label="Descripción" multiline minRows={3} value={draft.description} onChange={event=>set({description:event.target.value})}/>
     <Box><Stack direction="row" sx={{alignItems:'center',justifyContent:'space-between',gap:1,flexWrap:'wrap'}}><Typography component="h4" sx={{fontWeight:700}}>Categorías</Typography>{role==='admin'&&<Button onClick={()=>createCategory()}>Crear categoría</Button>}</Stack>
      {knownCategories.filter(category=>category.active||draft.categoryIds.includes(category.id)).map(category=><Stack key={category.id} direction="row" sx={{alignItems:'center',justifyContent:'space-between',gap:1}}><FormControlLabel sx={{minWidth:0,'& .MuiFormControlLabel-label':{overflowWrap:'anywhere'}}} label={`${category.name}${category.active?'':' (archivada)'}`} control={<Checkbox checked={draft.categoryIds.includes(category.id)} onChange={()=>set({categoryIds:draft.categoryIds.includes(category.id)?draft.categoryIds.filter(id=>id!==category.id):[...draft.categoryIds,category.id]})}/>}/>{role==='admin'&&<Button size="small" aria-label={`Editar categoría ${category.name}`} onClick={()=>setCategoryEditing({...category,isNew:false})}>Editar</Button>}</Stack>)}
     </Box>
     <TextField select label="Plantilla de cuidados" value={draft.careTemplateId} onChange={event=>set({careTemplateId:event.target.value})}><MenuItem value="">Personalizados</MenuItem>{templates.filter(template=>template.active||template.id===draft.careTemplateId).map(template=><MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}</TextField>
     <Button disabled={!draft.careTemplateId} onClick={()=>{const template=templates.find(item=>item.id===draft.careTemplateId);if(template?.care)set({care:Object.fromEntries(Object.entries(draft.care).map(([key,value])=>[key,value.trim()?value:template.care![key as keyof Draft['care']]])) as Draft['care'],sources:draft.sources.length?draft.sources:template.sources??[]});}}>Completar campos vacíos con la plantilla</Button>
     {Object.entries(careLabels).map(([key,label])=><TextField key={key} label={label} multiline value={draft.care[key as keyof typeof careLabels]} onChange={event=>set({care:{...draft.care,[key]:event.target.value}})}/>)}
     <TextField label="Advertencias para revisar" multiline value={draft.warnings} onChange={event=>set({warnings:event.target.value})}/>
    </Stack></Paper>
    {ai('content')}
    <Paper component="section" aria-labelledby="plant-sources-title" variant="outlined" sx={{p:{xs:2,sm:3}}}><Stack spacing={2}>
     <Typography id="plant-sources-title" component="h3" variant="h3">Fuentes y referencias</Typography>
     <Typography variant="body2">Podés agregar referencias escritas sin URL. Las notas manuales quedan sin verificar; una fuente verificada conserva su evidencia solo mientras no la modifiqués.</Typography>
     {draft.sources.map((source,i)=><Paper key={i} variant="outlined" sx={{p:2}}><Stack spacing={1}>
      <Chip size="small" sx={{alignSelf:'start'}} label={source.verification==='verified'?'Fuente verificada':'Referencia sin verificar'} color={source.verification==='verified'?'success':'default'}/>
      <TextField label={`Referencia ${i+1}`} multiline value={source.title} onChange={event=>editSource(i,{title:event.target.value})} slotProps={{htmlInput:{maxLength:200}}}/>
      <TextField label={`URL opcional ${i+1}`} value={source.url??''} helperText="Opcional. Usá una dirección HTTPS real si contás con ella." onChange={event=>editSource(i,{url:event.target.value})}/>
      <TextField label={`Fecha de consulta ${i+1}`} type="date" value={source.accessedAt??''} slotProps={{inputLabel:{shrink:true}}} onChange={event=>editSource(i,{accessedAt:event.target.value})}/>
      <Button onClick={()=>set({sources:draft.sources.filter((_,j)=>j!==i)})}>Quitar referencia {i+1}</Button>
     </Stack></Paper>)}
     <Button disabled={draft.sources.length>=20} onClick={()=>set({sources:[...draft.sources,{title:'',url:'',accessedAt:'',verification:'unverified'}]})}>Agregar referencia</Button>
    </Stack></Paper>
    <Box ref={enhancement} component="section" aria-labelledby="plant-image-enhance-title" sx={{scrollMarginTop:24}}><Stack spacing={2}>
     <Typography id="plant-image-enhance-title" component="h3" variant="h3">Mejora opcional de imágenes</Typography>
     <Typography variant="body2">Usá las imágenes originales o solicitá una propuesta para la que elijás. Seleccionar una imagen no genera IA.</Typography>
     {photos.length>0&&<TextField select label="Imagen para mejorar" value={photoId(enhancePhoto)} onChange={event=>setEditing(previous=>previous?{...previous,enhancePhotoId:event.target.value}:previous)}>{photos.map((photo,i)=><MenuItem key={photoId(photo)} value={photoId(photo)}>{`Imagen ${i+1} de ${photos.length}${i===0?' · Portada':''}`}</MenuItem>)}</TextField>}
     {enhancePhoto.originalPath?<PrivatePhoto key={enhancePhoto.approvedImagePath||enhancePhoto.originalPath} path={enhancePhoto.approvedImagePath||enhancePhoto.originalPath} label="Imagen elegida para publicar"/>:enhancePhoto.image.src&&<Box component="img" src={enhancePhoto.image.src} alt="Imagen elegida para publicar" sx={{width:'100%',maxHeight:320,objectFit:'contain',borderRadius:2}}/>}
     <Typography>{enhancePhoto.approvedImagePath?'Imagen elegida: propuesta revisada':'Imagen elegida: original'}</Typography>
     {enhancePhoto.approvedImagePath&&<Button onClick={()=>updatePhoto(photoId(enhancePhoto),{approvedImagePath:''})}>Volver a elegir el original</Button>}
     <Alert severity="info">Revisá hojas, tamaño, flores y condición antes de aceptar una mejora. El original siempre se conserva.</Alert>
     {ai('enhance',enhancePhoto)}
    </Stack></Box>
   </>}
   {phase===1&&<>
    <Paper variant="outlined" sx={{p:2}}><FormControlLabel label="Mostrar precios en el catálogo público" control={<Checkbox checked={draft.showPrice??false} onChange={event=>set({showPrice:event.target.checked})}/>}/><Typography variant="body2" color="text.secondary">La autorización se guarda con el borrador y se aplica al publicar. Solo se muestran precios existentes, asociados a su presentación y número de maceta.</Typography></Paper>
    {revision&&status!=='archived'?<><Alert severity="info">El inventario se guarda por separado del borrador. Registrar cantidades no publica la ficha y consultar por WhatsApp no descuenta existencias.</Alert><Inventory scopedPlantId={draft.id} plants={plants} stocks={stocks} movements={movements} run={run} busy={busy} draft={editing.inventory??emptyInventory()} onChange={inventory=>setEditing(previous=>previous?{...previous,inventory}:previous)}/></>:<Alert severity="info">Guardá primero la ficha para registrar existencias. Si está archivada, restaurala desde revisión.</Alert>}
   </>}
   {phase===2&&<>
    <Typography variant="body2" sx={{overflowWrap:'anywhere'}}>ID permanente: {draft.id}. Todas las macetas de este tipo comparten su QR.</Typography>
    {missing.length>0?<Alert severity="warning">Falta completar: {missing.join(', ')}.</Alert>:<Alert severity="success">Los campos requeridos están completos. Verificá la exactitud de los datos y las fuentes antes de publicar.</Alert>}
    <TextField label="Notas privadas" multiline value={draft.notes} onChange={event=>set({notes:event.target.value})}/>
    <Paper variant="outlined" sx={{p:2}}><Stack spacing={1}>
     <Typography component="h3" variant="h3">Vista previa pública</Typography><Typography sx={{fontWeight:700}}>{draft.name}</Typography>
     <DraftPhotoGallery draft={draft} preview={preview}/>
     <Typography variant="body2">{photos.length} imágenes en el detalle público · la primera es portada</Typography><Typography>{draft.description}</Typography>
     {Object.entries(draft.care).map(([key,value])=><Typography key={key}><strong>{careLabels[key as keyof typeof careLabels]}:</strong> {value}</Typography>)}<Typography>{draft.warnings}</Typography>
     <Typography>{draft.showPrice?'Se mostrarán los precios registrados para cada presentación.':'Los precios permanecerán privados.'}</Typography>
     {draft.sources.map((source,i)=><Typography key={i} variant="body2">{source.title} · {source.verification==='verified'?'Fuente verificada':'Referencia sin verificar'}{source.accessedAt?` · ${source.accessedAt}`:''}</Typography>)}
    </Stack></Paper>
    <Alert id="publication-next-step" severity="info">{publicationNextStep}</Alert>
    <Button variant="contained" disabled={busy||uploading||dirty||status!=='draft'||!revision} onClick={()=>void action('review')}>Enviar a revisión</Button>
    {role==='admin'&&<><FormControlLabel label="Revisé identificación, cuidados, fuentes y fotografía" control={<Checkbox disabled={busy||uploading||dirty||status!=='review'||missing.length>0} checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>}/><Button variant="contained" aria-describedby="publication-next-step" disabled={busy||uploading||dirty||!revision||status!=='review'||!reviewed||missing.length>0} onClick={()=>void action('publish')}>Publicar ficha</Button><Button disabled={busy||uploading||dirty||!revision} onClick={()=>void action(status==='archived'?'restore':'archive')}>{status==='archived'?'Restaurar borrador':'Archivar ficha'}</Button></>}
    {status==='published'&&<Button variant="outlined" onClick={onLabels}>Preparar etiquetas QR</Button>}
   </>}
  </Stack>
  <Paper elevation={2} sx={{position:'sticky',bottom:0,p:{xs:1,sm:2},zIndex:2,border:'1px solid',borderColor:'divider'}}><Stack spacing={1}>
   <Typography variant="caption" role="status">{uploading?'Subiendo original…':busy?'Guardando operación…':dirty?'Tus cambios se recuperan en este navegador. Guardá para sincronizarlos.':'Guardar no publica ni solicita IA.'}</Typography>
   <Stack direction="row" sx={{gap:1,display:{xs:'grid',sm:'flex'},gridTemplateColumns:'minmax(0,1fr) minmax(0,1.8fr) minmax(0,1fr)','& .MuiButton-root':{minWidth:0,px:1,fontSize:{xs:12,sm:14}}}}><Button disabled={phase===0||busy} onClick={()=>go(phase-1)}>Anterior</Button><Button variant="contained" disabled={!canSave} onClick={()=>void action('savePlant')}>Guardar borrador</Button><Button disabled={phase===phases.length-1||busy} onClick={()=>go(phase+1)}>Siguiente</Button></Stack>
  </Stack></Paper>
  {categoryEditing&&<CategoryInlineEditor key={categoryEditing.id} value={categoryEditing} run={run} busy={busy} onClose={()=>setCategoryEditing(null)} onSaved={categorySaved}/>}
 </Stack>;
}
