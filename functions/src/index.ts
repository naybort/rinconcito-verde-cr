import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { generateAI, RetryableAIError, type AIInput } from './ai.js';
import { safeAIFailure, type AIStage } from './aiErrors.js';
import { canAdmitAI, claimAI, type JobState } from './jobs.js';
import { aiRuntimeMode, assertAIEnabled, assertEmulatorIsolation, readAIKey, localFirebaseOptions } from './aiRuntime.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { aiRequestSchema, draftFromRecord, draftPhotos, hasPhoto, photoId, selectAIPhoto, draftSchema, idSchema, stockItemSchema, moveStock, assertPublishable, publicSnapshot, careSchema, sourceSchema, type Draft, type DraftPhoto, type Stock } from './domain.js';
const emulator=process.env.FUNCTIONS_EMULATOR==='true';
if(emulator)assertEmulatorIsolation(process.env);
// Explicit demo targets plus validated emulator endpoints prevent local data access to production.
initializeApp(emulator?localFirebaseOptions(process.env):undefined);
const db=getFirestore();
// Deployment region is explicit; FUNCTION_REGION is reserved by Firebase.
const region='us-central1';
const apiKey=defineSecret('OPENAI_API_KEY');
const options={region,maxInstances:4,concurrency:20,timeoutSeconds:60,enforceAppCheck:!emulator};
const envelope=z.object({requestId:z.string().uuid(),action:z.enum(['savePlant','review','publish','archive','restore','saveTaxonomy','inventory','presentation','requestAI']),payload:z.unknown()}).strict();
const versioned=z.object({id:idSchema,revision:z.number().int().nonnegative()}).strict();
const taxonomySchema=z.object({kind:z.enum(['categories','careTemplates']),id:idSchema,name:z.string().trim().min(1).max(120),active:z.boolean(),revision:z.number().int().nonnegative(),care:careSchema.optional(),sources:z.array(sourceSchema).max(20).optional()}).strict();
function error(message:string):never{throw new HttpsError('failed-precondition',message);}
function version(current:FirebaseFirestore.DocumentData|undefined,expected:number){if((current?.revision??0)!==expected)throw new HttpsError('aborted','Otra persona modificó este registro. Recargá antes de guardar.');}
async function categoryCheck(tx:Transaction,ids:string[]){for(const id of ids){const snap=await tx.get(db.doc(`categories/${id}`));if(!snap.exists||!snap.data()?.active)error(`Categoría no disponible: ${id}`);}}
async function validatePhoto(path:string,id:string){
 if(!new RegExp(`^(originals/[a-zA-Z0-9_-]+/${id}|proposals/${id})/[a-z0-9-]+$`).test(path))error('La fotografía no pertenece a esta ficha.');
 const file=getStorage().bucket().file(path);const [meta]=await file.getMetadata();
 if(Number(meta.size)>10*1024*1024||!['image/png','image/jpeg','image/webp'].includes(meta.contentType||''))error('Fotografía inválida.');
 const [data]=await file.download();
 const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const jpg=data[0]===255&&data[1]===216&&data[2]===255;const webp=data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
 if(!(png||jpg||webp))error('El contenido del archivo no es una imagen admitida.');
 return {file,data,mime:png?'image/png':jpg?'image/jpeg':'image/webp'};
}
async function validateSelection(photo:DraftPhoto,id:string,tx?:Transaction){
 if(!photo.approvedImagePath)return;
 const match=new RegExp(`^proposals/${id}/([a-z0-9-]+)$`).exec(photo.approvedImagePath);
 if(!match)error('Elegí el original o una propuesta revisada de esta fotografía.');
 const ref=db.doc(`aiJobs/${match[1]}`);const job=(await (tx?tx.get(ref):ref.get())).data();
 if(!job||job.plantId!==id||job.kind!=='enhance'||job.status!=='ready'||job.originalPath!==photo.originalPath||job.imagePath!==photo.approvedImagePath||(job.photoId&&job.photoId!==photoId(photo)))error('La propuesta IA no corresponde a esta fotografía.');
}
async function publishedPhotos(d:Draft,requestId:string){
 const prepared:({src:string}|{file:Awaited<ReturnType<typeof validatePhoto>>['file'];mime:string})[]=[];
 // Validate every reference before exposing any image; hold no image buffers across iterations.
 for(const photo of draftPhotos(d)){
  await validateSelection(photo,d.id);
  if(!photo.originalPath){if(!/^\/images\/(monstera|echeveria|calathea|sansevieria)(-detail)?\.png$/.test(photo.image.src))error('Subí una fotografía original para cada imagen.');prepared.push({src:photo.image.src});continue;}
  await validatePhoto(photo.originalPath,d.id);
  const {file,mime}=await validatePhoto(photo.approvedImagePath||photo.originalPath,d.id);prepared.push({file,mime});
 }
 const images:string[]=[];
 for(const [i,photo] of prepared.entries()){
  if('src' in photo){images.push(photo.src);continue;}
  const path=`public/${d.id}/${requestId}-${i}`;const destination=getStorage().bucket().file(path);
  await photo.file.copy(destination);
  await destination.setMetadata({contentType:photo.mime,cacheControl:'public,max-age=31536000,immutable',metadata:{firebaseStorageDownloadTokens:null}});
  const host=emulator?'http://'+process.env.FIREBASE_STORAGE_EMULATOR_HOST:'https://firebasestorage.googleapis.com';
  images.push(`${host}/v0/b/${getStorage().bucket().name}/o/${encodeURIComponent(path)}?alt=media`);
 }
 return images;
}
export const adminCommand=onCall(options,async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Iniciá sesión.');
 const {uid,token}=request.auth;
 const member=await db.doc(`adminUsers/${uid}`).get();
 if(!member.data()?.active||!['admin','editor'].includes(token.role)||member.data()?.role!==token.role)throw new HttpsError('permission-denied','No tenés acceso administrativo.');
 try{
 const {action,payload,requestId}=envelope.parse(request.data);
 if(['publish','archive','restore','saveTaxonomy'].includes(action)&&token.role!=='admin')throw new HttpsError('permission-denied','Esta acción requiere administrador.');
 const hash=createHash('sha256').update(JSON.stringify({action,payload})).digest('hex');
 const receiptRef=db.doc(`operations/${uid}-${requestId}`);
 const prior=await receiptRef.get();
 if(prior.exists){if(prior.data()?.hash!==hash)error('La operación ya se usó con otros datos.');return prior.data()?.result;}
 let imageSrcs:string[]=[];
 if(action==='publish'){
  const input=versioned.parse(payload);const snap=await db.doc(`plants/${input.id}`).get();version(snap.data(),input.revision);
  if(!snap.exists||snap.data()?.status!=='review')error('Enviá primero el borrador a revisión.');
  const draft=draftFromRecord(snap.data()!);
  assertPublishable(draft);imageSrcs=await publishedPhotos(draft,requestId);
 }
 return await db.runTransaction(async tx=>{
  const receipt=await tx.get(receiptRef);if(receipt.exists){if(receipt.data()?.hash!==hash)error('Operación reutilizada con otros datos.');return receipt.data()?.result;}
  const now=new Date().toISOString();let result:Record<string,unknown>={ok:true};
  const audit={action,actor:uid,at:now,requestId};
  if(action==='savePlant'){
   const input=z.object({draft:draftSchema,revision:z.number().int().nonnegative()}).strict().parse(payload);
   const ref=db.doc(`plants/${input.draft.id}`);const current=await tx.get(ref);version(current.data(),input.revision);
   if(current.data()?.status==='archived')error('Restaurá la ficha antes de editar.');
   await categoryCheck(tx,input.draft.categoryIds);
   if(input.draft.careTemplateId){const care=await tx.get(db.doc(`careTemplates/${input.draft.careTemplateId}`));if(!care.exists)error('Cuidados no encontrados.');}
   const photos=draftPhotos(input.draft);
   if(input.draft.gallery.length&&photos.some(p=>!hasPhoto(p)))error('Completá o quitá las fotografías vacías.');
   const references=photos.filter(hasPhoto).map(p=>p.originalPath||p.image.src);
   if(new Set(references).size!==references.length)error('No repitás la misma fotografía en la galería.');
   for(const photo of photos)for(const path of [photo.originalPath,photo.approvedImagePath])if(path&&!new RegExp(`^(originals/[a-zA-Z0-9_-]+/${input.draft.id}|proposals/${input.draft.id})/[a-z0-9-]+$`).test(path))error('Referencia de foto inválida.');
   for(const photo of photos)await validateSelection(photo,input.draft.id,tx);
   const value={...input.draft,publishedRevision:current.data()?.publishedRevision??null,revision:input.revision+1,status:'draft',updatedAt:now,updatedBy:uid};tx.set(ref,value);result={plant:value};
  }else if(['review','publish','archive','restore'].includes(action)){
   const input=versioned.parse(payload);const ref=db.doc(`plants/${input.id}`);const snap=await tx.get(ref);if(!snap.exists)error('Ficha no encontrada.');version(snap.data(),input.revision);
   const current=snap.data()!;const draft=draftFromRecord(current);
   if(action==='review'||action==='publish'){assertPublishable(draft);await categoryCheck(tx,draft.categoryIds);}
   if(action==='review'&&current.status!=='draft')error('Solo se revisan borradores.');
   if(action==='publish'&&current.status!=='review')error('La ficha necesita revisión.');
   if(action==='restore'&&current.status!=='archived')error('La ficha no está archivada.');
   const publicRef=db.doc(`publicPlants/${input.id}`);const pub=await tx.get(publicRef);
   const status=action==='review'?'review':action==='publish'?'published':action==='archive'?'archived':'draft';
   const value={...current,publishedRevision:action==='publish'?input.revision+1:current.publishedRevision??null,status,revision:input.revision+1,updatedAt:now,updatedBy:uid};
   tx.set(ref,value);if(action==='publish')tx.set(publicRef,publicSnapshot(draft,imageSrcs));
   if(action==='archive'&&pub.exists)tx.update(publicRef,{available:false});
   result={plant:value};
  }else if(action==='saveTaxonomy'){
   const input=taxonomySchema.parse(payload);if(input.kind==='careTemplates'&&!input.care)error('Completá los cuidados.');
   const ref=db.doc(`${input.kind}/${input.id}`);const snap=await tx.get(ref);version(snap.data(),input.revision);
   const value={id:input.id,name:input.name,active:input.active,revision:input.revision+1,...(input.care?{care:input.care,sources:input.sources??[]}:{})};tx.set(ref,value);
   // Public categories retain historical names for archived plant detail pages.
   if(input.kind==='categories')tx.set(db.doc(`publicCategories/${input.id}`),{id:input.id,name:input.name});result={taxonomy:value};
  }else if(action==='inventory'){
   const {items}=z.object({items:z.array(stockItemSchema).min(1).max(30)}).strict().parse(payload);
   const keys=items.map(i=>`${i.plantId}--${i.presentation}`);if(new Set(keys).size!==keys.length)error('Una operación por ficha/presentación en cada lote.');
   const updated=[];
   for(const [i,item]of items.entries()){
    const plant=await tx.get(db.doc(`plants/${item.plantId}`));if(!plant.exists||plant.data()?.status==='archived')error('Ficha inexistente o archivada.');
    const ref=db.doc(`stocks/${keys[i]}`);const snap=await tx.get(ref);const before=(snap.data()??{plantId:item.plantId,presentation:item.presentation,available:0,reserved:0}) as Stock;
    const after=moveStock(before,item);updated.push({ref,before,after,item,index:i});
   }
   for(const row of updated){tx.set(row.ref,row.after);tx.create(db.doc(`movements/${uid}-${requestId}-${row.index}`),{...row.item,before:row.before,after:row.after,actor:uid,at:now,requestId});}result={stocks:updated.map(v=>v.after)};
  }else if(action==='presentation'){
   const input=z.object({plantId:idSchema,presentation:idSchema,priceCRC:z.number().int().nonnegative().max(100000000).nullable(),location:z.string().max(200)}).strict().parse(payload);
   const plant=await tx.get(db.doc(`plants/${input.plantId}`));if(!plant.exists)error('Ficha no encontrada.');
   const ref=db.doc(`stocks/${input.plantId}--${input.presentation}`);const current=await tx.get(ref);tx.set(ref,{available:0,reserved:0,...current.data(),...input});
  }else if(action==='requestAI'){
   assertAIEnabled(process.env);
   const input=aiRequestSchema.parse(payload);
   const modelVariable=input.kind==='enhance'?'OPENAI_IMAGE_MODEL':'OPENAI_TEXT_MODEL';
   if(!process.env[modelVariable]?.trim())error(`Falta configurar ${modelVariable} en el backend para ${input.kind==='enhance'?'mejorar fotografías':'identificación y contenido'}. Guardá la configuración y recargá Functions.`);
   if(input.kind==='content'&&!input.confirmedName)error('Confirmá la identificación antes de solicitar cuidados.');
   const plant=await tx.get(db.doc(`plants/${input.plantId}`));version(plant.data(),input.revision);if(!plant.exists||plant.data()?.status==='archived')error('La ficha no está disponible para IA.');
   const photo=selectAIPhoto(draftFromRecord(plant.data()!),input.kind,input.photoId);
   const day=now.slice(0,10);const quotaRef=db.doc(`aiQuotas/${day}-${uid}`);const globalRef=db.doc(`aiQuotas/${day}`);const quota=await tx.get(quotaRef);const global=await tx.get(globalRef);
   if(!canAdmitAI(quota.data()?.count??0,global.data()?.count??0,emulator?'emulator':'production'))throw new HttpsError('resource-exhausted','Se alcanzó el límite diario de IA.');
   tx.set(quotaRef,{count:(quota.data()?.count??0)+1});tx.set(globalRef,{count:(global.data()?.count??0)+1});
   tx.create(db.doc(`aiJobs/${requestId}`),{...input,actor:uid,status:'queued',attempts:0,createdAt:now,originalPath:photo.originalPath,...(input.kind==='enhance'?{photoId:photoId(photo),baseApprovedImagePath:photo.approvedImagePath}:{}),nameHint:plant.data()!.name});result={jobId:requestId};
  }
  tx.create(db.doc(`audit/${uid}-${requestId}`),{...audit,target:typeof payload==='object'&&payload?JSON.parse(JSON.stringify(payload)):null});
  tx.create(receiptRef,{hash,result,createdAt:now});return result;
 });
 }catch(e){if(e instanceof HttpsError)throw e;if(e instanceof z.ZodError)throw new HttpsError('invalid-argument','Revisá los datos: '+e.issues.map(i=>i.path.join('.')+': '+i.message).join('; '));throw new HttpsError('failed-precondition',e instanceof Error?e.message:'No se pudo completar la operación.');}
});

// All external AI calls are opt-in and server-side. Retries reuse the job id and a lease.
export const processAI=onDocumentCreated({document:'aiJobs/{jobId}',region,...(emulator?{}:{secrets:[apiKey]}),retry:true,maxInstances:1,concurrency:1,timeoutSeconds:180},async event=>{
 if(aiRuntimeMode(process.env)==='disabled')return;
 const ref=event.data!.ref;
 const job=await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);const d=snap.data()!;
  const claim=claimAI(d as JobState,Date.now());
  if(claim.action==='skip')return null;
  if(claim.action==='wait')throw new Error('Job lease active');
  if(claim.action==='fail'){tx.update(ref,{status:'failed',error:claim.error});return null;}
  tx.update(ref,{status:'running',attempts:d.attempts+1,leaseUntil:Date.now()+190000});return d;
 });if(!job)return;
 let stage:AIStage='access';
 try{
  const member=await db.doc(`adminUsers/${job.actor}`).get();if(!member.data()?.active)throw new Error('Acceso revocado.');
  stage='photo';
  if(job.kind==='enhance'&&job.photoId){
   const plant=await db.doc(`plants/${job.plantId}`).get();
   if(!plant.exists||plant.data()?.status==='archived')throw new Error('La ficha ya no está disponible.');
   const photo=selectAIPhoto(draftFromRecord(plant.data()!),job.kind,job.photoId);
   if(photo.originalPath!==job.originalPath)throw new Error('La fotografía original cambió.');
  }
  const {data,mime}=await validatePhoto(job.originalPath,job.plantId);
  stage='catalog';const cats=await db.collection('categories').where('active','==',true).get();
  stage='provider';const result=await generateAI(job as AIInput,{data,mime},cats.docs.map(d=>d.id),{key:readAIKey(process.env,()=>apiKey.value()),textModel:process.env.OPENAI_TEXT_MODEL?.trim()||'',imageModel:process.env.OPENAI_IMAGE_MODEL?.trim()||'',requestId:event.params.jobId});
  stage='result';if(result.image){
   const imagePath=`proposals/${job.plantId}/${event.params.jobId}`;
   await getStorage().bucket().file(imagePath).save(result.image,{resumable:false,metadata:{contentType:'image/png'}});
   await ref.update({status:'ready',imagePath,usage:result.usage,completedAt:new Date().toISOString()});
  }else await ref.update({status:'ready',proposal:result.proposal,usage:result.usage,completedAt:new Date().toISOString()});
 }catch(e){
  const transient=e instanceof RetryableAIError;const failure=safeAIFailure(e,stage);
  await ref.update({status:transient?'queued':'failed',leaseUntil:0,error:failure.message,errorCode:failure.code,errorStage:stage,errorDetails:failure.details,lastFailureAt:new Date().toISOString()});
  console.warn('AI job failed',{jobId:event.params.jobId,stage,code:failure.code,...failure.details});
  if(transient)throw new Error('Retry AI job: '+failure.code,{cause:e});
 }
});
