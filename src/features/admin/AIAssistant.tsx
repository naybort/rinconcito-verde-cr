import { useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Paper, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { firebaseMode } from '../../lib/firebase';
import { identificationSchema, proposalSchema, draftPhotos, photoId, MAX_AI_INPUT_PHOTOS, type AIKind, type Draft, type DraftPhoto, type Taxonomy } from '../../../functions/src/domain';
import { PrivatePhoto } from './PrivatePhoto';
import { canApplyJob } from './workflow';
import { careLabels } from './Taxonomies';
import { jobLabels, statusLabels } from './uiLabels';
import { DictationInput } from './DictationInput';
import { contentFields, contentFieldLabels, fieldEmpty, fieldFingerprint, fieldSelected, fieldValue, selectedContentPatch, type ContentField, type ContentProposal, type FieldChoice } from './proposalSelection';
import type { Job } from './state';
import type { Run } from './Inventory';
const actions={identify:'Sugerir identificación',content:'Proponer contenido con fuentes',enhance:'Proponer mejora de fotografía'};
const examples={identify:'Ej.: compará con Echeveria y explicá qué rasgos permiten distinguirla.',content:'Ej.: priorizá cuidados para un balcón con luz indirecta en Costa Rica.',enhance:'Ej.: fondo claro y encuadre centrado; conservar la maceta y todos los detalles.'};

function Sources({sources}:{sources:ContentProposal['sources']}){
 const verified=sources.filter(source=>source.verification==='verified'&&source.url);
 const unverified=sources.filter(source=>source.verification!=='verified'||!source.url);
 return <Stack spacing={1}>
  <Typography sx={{fontWeight:700}}>Fuentes verificadas</Typography>
  {verified.length?verified.map((source,index)=><Typography key={index} variant="body2"><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>{source.accessedAt&&` · ${source.accessedAt}`}</Typography>):<Typography variant="body2">Esta propuesta no incluye fuentes verificadas.</Typography>}
  {unverified.length>0&&<><Typography sx={{fontWeight:700}}>Referencias sin verificar</Typography>{unverified.map((source,index)=><Typography key={index} variant="body2">{source.title}</Typography>)}<Typography variant="caption">Son textos para revisar. No se presentan como citas comprobadas.</Typography></>}
 </Stack>;
}
function ContentReview({proposal,job,draft,applicable,set,categories,onCreateCategory}:{proposal:ContentProposal;job:Job;draft:Draft;applicable:boolean;set:(patch:Partial<Draft>)=>void;categories:Taxonomy[];onCreateCategory?:(name:string)=>void}){
 const [choices,setChoices]=useState<Partial<Record<ContentField,FieldChoice>>>({});
 const selected=contentFields.filter(field=>fieldSelected(draft,proposal,field,choices[field]));
 const suggestedCategories=proposal.categorySuggestions.filter(name=>!categories.some(category=>category.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')));
 return <Stack spacing={2}>
  <Typography variant="h3">{proposal.name}</Typography><Typography sx={{whiteSpace:'pre-wrap'}}>{proposal.description}</Typography>
  <Typography>Categorías: {proposal.categoryIds.map(id=>categories.find(category=>category.id===id)?.name??id).join(', ')||'Sin sugerencias'}</Typography>
  {Object.entries(proposal.care).map(([key,text])=><Typography key={key}><strong>{careLabels[key as keyof typeof careLabels]}:</strong> {text||'Pendiente de completar'}</Typography>)}
  {proposal.warnings&&<Typography>{proposal.warnings}</Typography>}{proposal.uncertainty&&<Alert severity="info">{proposal.uncertainty}</Alert>}
  <Sources sources={proposal.sources}/>
  {suggestedCategories.length>0&&<Stack spacing={1}><Typography sx={{fontWeight:700}}>Categorías nuevas sugeridas</Typography>{suggestedCategories.map(name=><Box key={name}><Typography>{name}</Typography>{onCreateCategory&&<Button disabled={!applicable} onClick={()=>onCreateCategory(name)}>Crear categoría «{name}»</Button>}</Box>)}<Typography variant="caption">Cada categoría se revisa y guarda por separado.</Typography></Stack>}
  <Box component="fieldset" sx={{m:0,p:2,border:'1px solid #ccd8d0',borderRadius:2,minWidth:0}}>
   <Typography component="legend" sx={{fontWeight:700}}>Elegí qué aplicar</Typography>
   <Typography variant="body2">Los campos vacíos vienen seleccionados. Revisá y marcá expresamente cualquier campo que ya tenga contenido.</Typography>
   <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},mt:1}}>
    {contentFields.filter(field=>!fieldEmpty(fieldValue(proposal,field))).map(field=><FormControlLabel key={field} control={<Checkbox checked={selected.includes(field)} disabled={!applicable} onChange={event=>setChoices(previous=>({...previous,[field]:{selected:event.target.checked,fingerprint:fieldFingerprint(draft,field)}}))}/>} label={`Aplicar ${contentFieldLabels[field]}${fieldEmpty(fieldValue(draft,field))?'':' (reemplaza lo escrito)'}`}/>)}
   </Box>
  </Box>
  <Button variant="outlined" disabled={!applicable||!selected.length} onClick={()=>set(selectedContentPatch(draft,proposal,selected,job.id))}>Aplicar campos seleccionados al borrador</Button>
  <Typography variant="body2">Solo cambia la selección que revisaste. El nombre, las fotos y cualquier otro campo sin seleccionar se conservan.</Typography>
 </Stack>;
}

export function AIAssistant({kind,draft,revision,dirty,busy,blocked,nextStep,canSave,save,jobs,run,set,photo,onPhotoChange,categories=[],onCreateCategory}:{photo?:DraftPhoto;onPhotoChange?:(patch:Partial<DraftPhoto>)=>void;kind:AIKind;draft:Draft;revision:number;dirty:boolean;busy:boolean;blocked:boolean;nextStep:string;canSave:boolean;save:()=>void;jobs:Job[];run:Run;set:(patch:Partial<Draft>)=>void;categories?:Taxonomy[];onCreateCategory?:(name:string)=>void}){
 const [submitted,setSubmitted]=useState<string|null>(null);const requestLock=useRef(false);const target=photo??draftPhotos(draft)[0];
 const availablePhotos=draftPhotos(draft).filter(item=>item.originalPath);
 const [inputMode,setInputMode]=useState<'photos'|'name'>(()=>availablePhotos.length?'photos':'name');
 const [photoSelection,setPhotoSelection]=useState<string[]|null>(null);
 const selectedPhotoIds=(photoSelection??availablePhotos.slice(0,1).map(photoId)).filter(id=>availablePhotos.some(item=>photoId(item)===id));
 const related=jobs.filter(job=>job.plantId===draft.id&&job.kind===kind&&(kind!=='enhance'||(job.photoId||job.originalPath)===photoId(target))).sort((a,b)=>(b.createdAt??'').localeCompare(a.createdAt??''));
 const waiting=related.some(job=>['queued','running'].includes(job.status))||!!(submitted&&!related.some(job=>job.id===submitted));
 const instructions=kind==='enhance'?(target.enhanceInstructions??''):draft.ai.instructions[kind];
 const updateInstructions=(value:string)=>kind==='enhance'?onPhotoChange?.({enhanceInstructions:value}):set({ai:{...draft.ai,instructions:{...draft.ai.instructions,[kind]:value}}});
 const inputHint=kind==='identify'?(inputMode==='photos'&&!selectedPhotoIds.length?'Seleccioná al menos una fotografía original guardada, o elegí identificar a partir del nombre.':inputMode==='name'&&!draft.name.trim()?'Escribí un nombre de referencia y guardá el borrador.':''):kind==='content'&&!draft.ai.confirmedName.trim()?'Confirmá o corregí la identificación de la planta antes de generar cuidados. Podés completar los campos manualmente.':kind==='enhance'&&!target.originalPath?'Subí y guardá una fotografía original para proponer su mejora.':'';
 async function generate(){
  if(blocked||waiting||inputHint||requestLock.current)return;requestLock.current=true;
  try{
   const request={plantId:draft.id,revision,kind,confirmedName:kind==='content'?draft.ai.confirmedName:kind==='identify'&&inputMode==='name'?draft.name:'',additionalInstructions:instructions,...(kind==='enhance'?{inputMode:'photos',photoId:photoId(target)}:kind==='content'?{inputMode:'name'}:{inputMode,...(inputMode==='photos'?{photoIds:selectedPhotoIds}:{})})};
   const result=await run('requestAI',request) as {jobId?:string}|undefined;if(result?.jobId)setSubmitted(result.jobId);
  }finally{requestLock.current=false;}
 }
 return <Paper component="section" aria-label={`Asistencia IA · ${jobLabels[kind]}`} variant="outlined" sx={{p:{xs:2,sm:3},bgcolor:'#f2f7f3'}}><Stack spacing={2}>
  <Typography component="h3" variant="h3">Asistencia IA · {jobLabels[kind]}</Typography>
  <Typography variant="body2">La IA trabaja solo cuando solicitás una propuesta. Revisá cada sugerencia antes de usarla; guardar y editar mantienen tu trabajo manual.</Typography>
  <Typography variant="caption">OpenAI recibe el nombre, las instrucciones y las imágenes seleccionadas cuando corresponda. Las propuestas no se publican automáticamente.</Typography>
  {firebaseMode==='emulator'&&<Typography variant="body2">Prueba local: OpenAI real puede tener coste; la API se factura por separado de ChatGPT.</Typography>}
  {kind==='identify'&&<Box><RadioGroup row aria-label="Referencia para identificar" value={inputMode} onChange={event=>setInputMode(event.target.value as 'photos'|'name')}><FormControlLabel value="photos" control={<Radio/>} label="A partir de fotos"/><FormControlLabel value="name" control={<Radio/>} label="A partir del nombre"/></RadioGroup>
   {inputMode==='name'?<Typography>Nombre de referencia: <strong>{draft.name||'Pendiente'}</strong>. La sugerencia necesitará tu confirmación.</Typography>:<><Typography variant="body2">Elegí hasta {MAX_AI_INPUT_PHOTOS} imágenes de la misma planta.</Typography><Stack direction="row" sx={{gap:1,flexWrap:'wrap'}}>{availablePhotos.map((item,index)=>{const id=photoId(item),checked=selectedPhotoIds.includes(id);return <FormControlLabel key={id} control={<Checkbox checked={checked} disabled={busy||(!checked&&selectedPhotoIds.length>=MAX_AI_INPUT_PHOTOS)} onChange={()=>setPhotoSelection(checked?selectedPhotoIds.filter(value=>value!==id):[...selectedPhotoIds,id])}/>} label={`Imagen ${index+1}${item.image.alt?` · ${item.image.alt}`:''}`}/>;})}</Stack></>}
  </Box>}
  <TextField label={`Instrucciones adicionales · ${jobLabels[kind]}`} value={instructions} multiline minRows={2} placeholder={examples[kind]} helperText={`Opcional · ${instructions.length}/2000 caracteres. No incluyás claves ni datos sensibles.`} slotProps={{htmlInput:{maxLength:2000}}} onChange={event=>updateInstructions(event.target.value)}/>
  <DictationInput value={instructions} onChange={updateInstructions} label={jobLabels[kind]} disabled={busy}/>
  {nextStep&&<Alert severity="info">{nextStep}</Alert>}{inputHint&&<Alert severity="info">{inputHint}</Alert>}
  {(dirty||!revision)&&<Button variant="outlined" disabled={!canSave} onClick={save}>Guardar borrador para usar IA</Button>}
  <Button variant="contained" disabled={blocked||waiting||!!inputHint} onClick={()=>void generate()}>{waiting?'Preparando propuesta…':actions[kind]}</Button>
  {waiting&&<Stack direction="row" spacing={1} sx={{alignItems:'center'}} role="status"><CircularProgress size={20}/><Typography variant="body2">La propuesta aparecerá aquí. Podés seguir editando.</Typography></Stack>}
  {related.map((job,index)=>{
   const legacy=job.kind==='identify'&&job.proposal&&typeof job.proposal.name==='string'?{scientificName:'',commonName:job.proposal.name,uncertainty:String(job.proposal.uncertainty??'Confirmá la identificación.')}:job.proposal;
   const identification=job.kind==='identify'?identificationSchema.safeParse(legacy):null;
   const content=job.kind==='content'?proposalSchema.safeParse(job.proposal):null;
   const current=canApplyJob(job,draft,revision,dirty,kind==='content');const applicable=!busy&&current;
   const candidates=identification?.success?[identification.data,...identification.data.alternatives].filter(candidate=>candidate.scientificName||candidate.commonName):[];
   return <Paper component="details" key={job.id} open={index===0} variant="outlined" sx={{p:2,overflowWrap:'anywhere'}}>
    <Typography component="summary" sx={{cursor:'pointer',minHeight:44,fontWeight:700}}>{jobLabels[job.kind]}: {statusLabels[job.status]??job.status} · versión {job.revision}</Typography><Stack spacing={2}>
     {job.additionalInstructions&&<Typography variant="body2">Instrucciones usadas: {job.additionalInstructions}</Typography>}{job.error&&<Alert severity="warning">{job.error} El borrador se conserva.</Alert>}
     {job.imagePath&&<><Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2}}><Box><Typography>Original privado</Typography><PrivatePhoto path={job.originalPath||target.originalPath} label="Fotografía original"/></Box><Box><Typography>Propuesta IA</Typography><PrivatePhoto path={job.imagePath} label="Fotografía propuesta por IA"/></Box></Box><Button disabled={!applicable} onClick={()=>onPhotoChange?.({approvedImagePath:job.imagePath!})}>Verifiqué los detalles reales y elijo esta foto</Button></>}
     {identification?.success&&<Stack spacing={2}>{candidates.length?candidates.map((candidate,candidateIndex)=><Paper key={candidateIndex} variant="outlined" sx={{p:2}}><Stack spacing={1}>
      <Typography><strong>Nombre científico:</strong> {candidate.scientificName||'No identificado'}</Typography><Typography><strong>Nombre común:</strong> {candidate.commonName||'No identificado'}</Typography>
      <Typography variant="body2">{candidate.uncertainty||'Confirmá esta sugerencia antes de usarla.'}</Typography>
      <Stack direction={{xs:'column',sm:'row'}} spacing={1}>{([['commonName','común'],['scientificName','científico']] as const).map(([key,label])=>candidate[key]&&<Button key={key} variant="outlined" disabled={!applicable} onClick={()=>set({name:candidate[key],ai:{...draft.ai,confirmedName:candidate.scientificName||candidate.commonName}})}>{candidateIndex===0?`Usar nombre ${label} en la ficha`:`Usar ${candidate[key]}`}</Button>)}</Stack>
     </Stack></Paper>):<Alert severity="info">{identification.data.uncertainty||'No se obtuvo una identificación. Podés escribirla manualmente.'}</Alert>}</Stack>}
     {content?.success&&<ContentReview proposal={content.data} job={job} draft={draft} applicable={applicable} set={set} categories={categories} onCreateCategory={onCreateCategory}/>}
     {job.proposal&&((identification&&!identification.success)||(content&&!content.success))&&<Alert severity="warning">La propuesta no tiene un formato válido. Podés completar la ficha manualmente.</Alert>}
     {job.status==='ready'&&kind==='enhance'&&target.approvedImagePath===job.imagePath?<Alert severity="success">Esta propuesta está elegida para esta fotografía. Podés volver al original sin generar otra.</Alert>:job.status==='ready'&&!current&&<Alert severity="info">{kind==='enhance'?'La foto, sus instrucciones o la elección cambiaron desde esta solicitud. Se conserva la propuesta.':'La revisión, identificación o imágenes de referencia cambiaron. Esta propuesta se conserva para consulta y no se aplicará sobre el borrador actual.'}</Alert>}
    </Stack>
   </Paper>;
  })}
 </Stack></Paper>;
}
