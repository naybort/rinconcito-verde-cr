// The OpenAI transport is intercepted in this test process. No real key or external request is used.
import { before, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const backendRequire=createRequire(process.env.RV_TEST_FUNCTIONS_SOURCE+'/package.json');
const {getApp,deleteApp}=backendRequire('firebase-admin/app');
const {getFirestore}=backendRequire('firebase-admin/firestore');
const {getStorage}=backendRequire('firebase-admin/storage');
for(const key of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'])if(!/^127\.0\.0\.1:\d{1,5}$/.test(process.env[key]||''))throw new Error('Solo emuladores locales.');
const projectId='demo-rinconcito-verde-tests';
Object.assign(process.env,{
 FUNCTIONS_EMULATOR:'true',GCLOUD_PROJECT:projectId,GOOGLE_CLOUD_PROJECT:projectId,GOOGLE_CLOUD_QUOTA_PROJECT:projectId,
 FIREBASE_CONFIG:JSON.stringify({projectId,storageBucket:projectId+'.appspot.com'}),STORAGE_EMULATOR_HOST:'http://'+process.env.FIREBASE_STORAGE_EMULATOR_HOST,
 AI_ENABLED:'true',AI_EMULATOR_OPENAI:'true',OPENAI_LOCAL_API_KEY:'test-only-placeholder',OPENAI_TEXT_MODEL:'mock-text',OPENAI_IMAGE_MODEL:'mock-image'
});
const {adminCommand,processAI}=await import(pathToFileURL(process.env.RV_TEST_FUNCTIONS_SOURCE+'/lib/index.js').href);
const db=getFirestore();let providerCalls=0;let image;let expectedEditImage;let entered;let release;let gate;let providerFailure=null;let providerBodyOverride;
const originalPath='originals/local-admin/local-ai-test/original';
const originalFetch=globalThis.fetch;
const proposedImage=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const call=(action,payload,requestId=crypto.randomUUID())=>adminCommand.run({auth:{uid:'local-admin',token:{role:'admin'}},data:{action,payload,requestId}});
const run=id=>processAI.run({data:{ref:db.doc('aiJobs/'+id)},params:{jobId:id}});
before(async()=>{
 image=await readFile('tests/fixtures/images/monstera.png');expectedEditImage=image;
 await getStorage().bucket().file(originalPath).save(image,{resumable:false,metadata:{contentType:'image/png'}});
 mock.method(globalThis,'fetch',async(url,options)=>{
  const parsed=new URL(String(url));
  if(parsed.hostname!=='api.openai.com'){
   if(!['127.0.0.1','localhost'].includes(parsed.hostname))throw new Error('External traffic forbidden by test');
   return originalFetch(url,options);
  }
  providerCalls++;entered?.();if(gate)await gate;
  if(providerFailure)return new globalThis.Response(JSON.stringify({error:{code:providerFailure.code,message:'test-only-private-marker'}}),{status:providerFailure.status});
  if(providerBodyOverride!==undefined)return new globalThis.Response(JSON.stringify(providerBodyOverride));
  if(parsed.pathname==='/v1/images/edits'){assert.deepEqual(Buffer.from(await options.body.get('image').arrayBuffer()),expectedEditImage);return new globalThis.Response(JSON.stringify({data:[{b64_json:proposedImage.toString('base64')}],usage:{output_tokens:10}}));}
  const body=JSON.parse(String(options.body));const content=!!body.tools;
  const proposal=content?{name:'Identificación confirmada',description:'Propuesta revisable',categoryIds:['interior'],care:{light:'Sugerencia de luz',watering:'Sugerencia de riego',humidity:'Normal',temperature:'Templada'},warnings:'',sources:[{title:'Fuente de prueba',url:'https://example.test/botany',accessedAt:new Date().toISOString().slice(0,10)}],uncertainty:'Requiere revisión'}:{scientificName:'Dracaena trifasciata',commonName:'Lengua de suegra',uncertainty:'Verificar con una persona'};
  return new globalThis.Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify(proposal),annotations:content?[{type:'url_citation',url:'https://example.test/botany'}]:[]}]}],usage:{output_tokens:10}}));
 });
 await call('savePlant',{revision:0,draft:{id:'local-ai-test',name:'Nombre orientativo',description:'Manual permanece intacto',categoryIds:['interior'],care:{light:'Manual',watering:'Manual',humidity:'Manual',temperature:'Manual'},careTemplateId:'',sources:[],warnings:'',image:{src:'',alt:'Foto original'},originalPath,approvedImagePath:'',notes:'Privado'}});
});
after(async()=>{mock.restoreAll();await db.terminate();await deleteApp(getApp());});
test('modo local admitido: recibo, cuota y lease impiden doble ejecución; resultado nunca publica',async()=>{
 const requestId=crypto.randomUUID();const payload={plantId:'local-ai-test',revision:1,kind:'identify',confirmedName:''};
 const [a,b]=await Promise.all([call('requestAI',payload,requestId),call('requestAI',payload,requestId)]);assert.equal(a.jobId,b.jobId);
 const started=new Promise(resolve=>{entered=resolve;});gate=new Promise(resolve=>{release=resolve;});
 const first=run(a.jobId);await started;
 await assert.rejects(run(a.jobId),/lease active/);release();await first;gate=null;entered=null;
 await run(a.jobId);assert.equal(providerCalls,1);
 const job=(await db.doc('aiJobs/'+a.jobId).get()).data();assert.equal(job.status,'ready');assert.equal(job.attempts,1);assert.equal(job.proposal.scientificName,'Dracaena trifasciata');assert.equal(job.proposal.commonName,'Lengua de suegra');
 const quota=(await db.doc('aiQuotas/'+new Date().toISOString().slice(0,10)+'-local-admin').get()).data();assert.equal(quota.count,1);
 assert.equal((await db.doc('plants/local-ai-test').get()).data().description,'Manual permanece intacto');assert.equal((await db.doc('publicPlants/local-ai-test').get()).exists,false);
});
test('contenido con fuentes y mejora conservan la ficha y el original, con propuestas privadas',async()=>{
 const content=await call('requestAI',{plantId:'local-ai-test',revision:1,kind:'content',confirmedName:'Identificación confirmada'});await run(content.jobId);
 const proposal=(await db.doc('aiJobs/'+content.jobId).get()).data();assert.equal(proposal.status,'ready');assert.equal(proposal.proposal.sources.length,1);
 const enhanced=await call('requestAI',{plantId:'local-ai-test',revision:1,kind:'enhance',confirmedName:''});await run(enhanced.jobId);
 const job=(await db.doc('aiJobs/'+enhanced.jobId).get()).data();assert.equal(job.status,'ready');assert.equal(job.imagePath,'proposals/local-ai-test/'+enhanced.jobId);
 assert.deepEqual((await getStorage().bucket().file(originalPath).download())[0],image);assert.deepEqual((await getStorage().bucket().file(job.imagePath).download())[0],proposedImage);
 const plant=(await db.doc('plants/local-ai-test').get()).data();assert.equal(plant.revision,1);assert.equal(plant.approvedImagePath,'');assert.equal(plant.care.light,'Manual');assert.equal(providerCalls,3);
});
test('fallos de autenticación y saldo guardan diagnóstico seguro y no reejecutan el trabajo',async()=>{
 for(const sample of [{status:401,code:'invalid_api_key',expected:'provider_auth'},{status:429,code:'insufficient_quota',expected:'provider_quota'}]){
  providerFailure=sample;const created=await call('requestAI',{plantId:'local-ai-test',revision:1,kind:'identify',confirmedName:''});await run(created.jobId);
  const job=(await db.doc('aiJobs/'+created.jobId).get()).data();assert.equal(job.status,'failed');assert.equal(job.attempts,1);assert.equal(job.errorCode,sample.expected);assert.equal(job.errorStage,'provider');assert.equal(job.errorDetails.httpStatus,sample.status);assert.equal(JSON.stringify(job).includes('test-only-private-marker'),false);
  const calls=providerCalls;await run(created.jobId);assert.equal(providerCalls,calls);
 }
 providerFailure=null;assert.equal(providerCalls,5);assert.equal((await db.doc('publicPlants/local-ai-test').get()).exists,false);
});
test('emuladores admiten solicitudes tras agotar ambos cupos y mantienen contadores idempotentes',async()=>{
 const day=new Date().toISOString().slice(0,10);const userQuota=db.doc('aiQuotas/'+day+'-local-admin');const globalQuota=db.doc('aiQuotas/'+day);
 assert.equal((await userQuota.get()).data().count,5);await globalQuota.set({count:30});
 const requestId=crypto.randomUUID();const payload={plantId:'local-ai-test',revision:1,kind:'identify',confirmedName:''};
 const [a,b]=await Promise.all([call('requestAI',payload,requestId),call('requestAI',payload,requestId)]);assert.equal(a.jobId,b.jobId);
 assert.equal((await userQuota.get()).data().count,6);assert.equal((await globalQuota.get()).data().count,31);
 await run(a.jobId);await run(a.jobId);assert.equal(providerCalls,6);assert.equal((await db.doc('aiJobs/'+a.jobId).get()).data().status,'ready');
});
test('cada acción informa el modelo ausente antes de crear trabajos o consumir cuota',async()=>{
 const quota=db.doc('aiQuotas/'+new Date().toISOString().slice(0,10)+'-local-admin');const count=(await quota.get()).data().count;
 for(const [kind,variable] of [['identify','OPENAI_TEXT_MODEL'],['content','OPENAI_TEXT_MODEL'],['enhance','OPENAI_IMAGE_MODEL']]){
  const previous=process.env[variable];process.env[variable]='   ';
  try{await assert.rejects(call('requestAI',{plantId:'local-ai-test',revision:1,kind,confirmedName:'Nombre revisado'}),new RegExp(variable));}finally{process.env[variable]=previous;}
 }
 assert.equal((await quota.get()).data().count,count);assert.equal(providerCalls,6);
});
test('clave local ausente o indicador apagado rechazan antes de gastar cuota o llamar al proveedor',async()=>{
 const before=(await db.doc('aiQuotas/'+new Date().toISOString().slice(0,10)+'-local-admin').get()).data().count;
 process.env.OPENAI_LOCAL_API_KEY='';await assert.rejects(call('requestAI',{plantId:'local-ai-test',revision:1,kind:'identify',confirmedName:''}),/clave local/);
 process.env.OPENAI_LOCAL_API_KEY='test-only-placeholder';process.env.AI_EMULATOR_OPENAI='false';await assert.rejects(call('requestAI',{plantId:'local-ai-test',revision:1,kind:'identify',confirmedName:''}),/IA desactivada/);
 assert.equal((await db.doc('aiQuotas/'+new Date().toISOString().slice(0,10)+'-local-admin').get()).data().count,before);assert.equal(providerCalls,6);
});

test('instrucciones se guardan por tipo y viajan desde solicitud a trabajo y proveedor sin publicar',async()=>{
 process.env.AI_EMULATOR_OPENAI='true';const calls=providerCalls;
 const preferences={confirmedName:'Identificación humana',instructions:{identify:'Compará especies posibles',content:'Cuidados para Costa Rica',enhance:'Fondo claro sin alterar hojas'}};
 const snapshot=(await db.doc('plants/local-ai-test').get()).data();
 const {revision,status,updatedAt,updatedBy,publishedRevision,...draft}=snapshot;void status;void updatedAt;void updatedBy;void publishedRevision;
 const saved=await call('savePlant',{revision,draft:{...draft,ai:preferences}});assert.deepEqual(saved.plant.ai,preferences);
 for(const kind of ['identify','content','enhance']){
  const additionalInstructions=preferences.instructions[kind];let captured=false;
  const transport=globalThis.fetch;const spy=mock.method(globalThis,'fetch',async(url,options)=>{
   if(new URL(String(url)).hostname==='api.openai.com'){
    const prompt=options.body instanceof globalThis.FormData?options.body.get('prompt'):JSON.parse(options.body).input[0].content[0].text;
    assert.ok(prompt.includes(additionalInstructions));captured=true;
   }
   return transport(url,options);
  });
  const created=await call('requestAI',{plantId:'local-ai-test',revision:saved.plant.revision,kind,confirmedName:preferences.confirmedName,additionalInstructions});
  assert.equal((await db.doc('aiJobs/'+created.jobId).get()).data().additionalInstructions,additionalInstructions);
  await run(created.jobId);spy.mock.restore();assert.ok(captured);assert.equal((await db.doc('aiJobs/'+created.jobId).get()).data().status,'ready');
 }
 assert.equal(providerCalls,calls+3);assert.deepEqual((await db.doc('plants/local-ai-test').get()).data().ai,preferences);assert.equal((await db.doc('publicPlants/local-ai-test').get()).exists,false);
 const quota=db.doc('aiQuotas/'+new Date().toISOString().slice(0,10)+'-local-admin');const count=(await quota.get()).data().count;
 for(const additionalInstructions of [null,{},42,'x'.repeat(2001)])await assert.rejects(call('requestAI',{plantId:'local-ai-test',revision:saved.plant.revision,kind:'identify',confirmedName:'',additionalInstructions}),/additionalInstructions/);
 assert.equal((await quota.get()).data().count,count);assert.equal(providerCalls,calls+3);
});

test('mejora cada foto por identidad estable, valida selección y publica original/propuesta individualmente',async()=>{
 const {blankDraft,draftFromRecord,draftPhotos,photoId,withPhotos}=await import(pathToFileURL(process.env.RV_TEST_FUNCTIONS_SOURCE+'/lib/domain.js').href);
 const id='photo-ai-binding';const secondary=await readFile('tests/fixtures/images/calathea.png');const sources=[image,secondary];
 const photos=sources.map((_,i)=>({image:{src:'',alt:'Vista '+i},originalPath:`originals/local-admin/${id}/photo-${i}`,approvedImagePath:'',enhanceInstructions:i?'Fondo claro para esta foto':'Conservar sombras'}));
 for(const [i,photo] of photos.entries())await getStorage().bucket().file(photo.originalPath).save(sources[i],{resumable:false,metadata:{contentType:'image/png'}});
 const draft=withPhotos({...blankDraft(id),name:'Galería IA',description:'Manual',categoryIds:['interior'],care:{light:'Manual',watering:'Manual',humidity:'Manual',temperature:'Manual'}},photos);
 await call('savePlant',{draft,revision:0});const quota=db.doc('aiQuotas/'+new Date().toISOString().slice(0,10)+'-local-admin');const count=(await quota.get()).data().count;const calls=providerCalls;
 for(const foreign of ['originals/local-admin/other/photo','originals/local-admin/'+id+'/removed'])await assert.rejects(call('requestAI',{plantId:id,revision:1,kind:'enhance',confirmedName:'',photoId:foreign}),/ya no está/);
 assert.equal((await quota.get()).data().count,count);assert.equal(providerCalls,calls);
 const requestId=crypto.randomUUID();const payload={plantId:id,revision:1,kind:'enhance',confirmedName:'',photoId:photoId(photos[1]),additionalInstructions:photos[1].enhanceInstructions};
 const [one,two]=await Promise.all([call('requestAI',payload,requestId),call('requestAI',payload,requestId)]);assert.equal(one.jobId,two.jobId);
 let saved=await call('savePlant',{draft:withPhotos(draft,[photos[1],photos[0]]),revision:1});
 let prompt='';const transport=globalThis.fetch;const spy=mock.method(globalThis,'fetch',async(url,options)=>{if(new URL(String(url)).hostname==='api.openai.com')prompt=options.body.get('prompt');return transport(url,options);});
 expectedEditImage=secondary;try{await run(one.jobId);await run(one.jobId);}finally{spy.mock.restore();expectedEditImage=image;}
 assert.equal(providerCalls,calls+1);assert.ok(prompt.includes(photos[1].enhanceInstructions));const job=(await db.doc('aiJobs/'+one.jobId).get()).data();assert.equal(job.status,'ready');assert.equal(job.originalPath,photos[1].originalPath);assert.equal(job.photoId,photoId(photos[1]));assert.equal(job.baseApprovedImagePath,'');
 const current=draftFromRecord(saved.plant);const ordered=draftPhotos(current);
 await assert.rejects(call('savePlant',{draft:withPhotos(current,[ordered[0],{...ordered[1],approvedImagePath:job.imagePath}]),revision:2}),/no corresponde/);
 await assert.rejects(call('savePlant',{draft:withPhotos(current,[{...ordered[0],approvedImagePath:`proposals/${id}/missing`},ordered[1]]),revision:2}),/no corresponde/);
 saved=await call('savePlant',{draft:withPhotos(current,[{...ordered[0],approvedImagePath:job.imagePath},ordered[1]]),revision:2});
 await call('review',{id,revision:3});await call('publish',{id,revision:4});
 let pub=(await db.doc('publicPlants/'+id).get()).data();assert.equal(pub.images.length,2);assert.equal(JSON.stringify(pub).includes('enhanceInstructions'),false);
 for(const [i,expected] of [proposedImage,image].entries()){const response=await originalFetch(pub.images[i].src);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected);}
 assert.deepEqual((await getStorage().bucket().file(photos[1].originalPath).download())[0],secondary);
 const originalAgain=draftFromRecord(saved.plant);originalAgain.approvedImagePath='';await call('savePlant',{draft:originalAgain,revision:5});await call('review',{id,revision:6});await call('publish',{id,revision:7});
 pub=(await db.doc('publicPlants/'+id).get()).data();assert.deepEqual(Buffer.from(await (await originalFetch(pub.images[0].src)).arrayBuffer()),secondary);assert.equal(providerCalls,calls+1);
});

test('retirar una foto antes de procesar su trabajo no consume proveedor ni se aplica a la siguiente',async()=>{
 const {blankDraft,draftFromRecord,withPhotos}=await import(pathToFileURL(process.env.RV_TEST_FUNCTIONS_SOURCE+'/lib/domain.js').href);
 const id='photo-ai-removed';const photo={image:{src:'',alt:'Original'},originalPath:`originals/local-admin/${id}/photo`,approvedImagePath:''};
 await getStorage().bucket().file(photo.originalPath).save(image,{resumable:false,metadata:{contentType:'image/png'}});
 const saved=await call('savePlant',{draft:withPhotos({...blankDraft(id),name:'Retirar foto'},[photo]),revision:0});const created=await call('requestAI',{plantId:id,revision:1,kind:'enhance',confirmedName:'',photoId:photo.originalPath});
 await call('savePlant',{draft:withPhotos(draftFromRecord(saved.plant),[]),revision:1});const count=providerCalls;await run(created.jobId);
 const job=(await db.doc('aiJobs/'+created.jobId).get()).data();assert.equal(job.status,'failed');assert.equal(job.errorStage,'photo');assert.equal(providerCalls,count);assert.equal((await db.doc('plants/'+id).get()).data().approvedImagePath,'');
});

test('contenido: distingue fallo de formato, truncamiento y rechazo sin repetir ni modificar el borrador',async()=>{
 const before=(await db.doc('plants/local-ai-test').get()).data();
 const cases=[
  {body:{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[],usage:{output_tokens:3000,output_tokens_details:{reasoning_tokens:2900}}},code:'response_incomplete',details:{responseStage:'envelope',reason:'max_output_tokens',outputTokens:3000,reasoningTokens:2900}},
  {body:{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'private-test-marker'}]}]},code:'response_refused',details:{responseStage:'envelope',reason:'refusal'}},
  {body:{status:'completed',output:[]},code:'response_empty',details:{responseStage:'json',reason:'empty_text'}},
  {body:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'private-test-marker'}]}]},code:'response_invalid',details:{responseStage:'json',reason:'invalid_json'}}
 ];
 try{for(const sample of cases){
  providerBodyOverride=sample.body;const created=await call('requestAI',{plantId:'local-ai-test',revision:before.revision,kind:'content',confirmedName:'Pastora'});const calls=providerCalls;await run(created.jobId);await run(created.jobId);
  const job=(await db.doc('aiJobs/'+created.jobId).get()).data();assert.equal(job.status,'failed');assert.equal(job.errorCode,sample.code);assert.deepEqual(job.errorDetails,sample.details);assert.equal(job.attempts,1);assert.equal(providerCalls,calls+1);assert.equal(JSON.stringify(job).includes('private-test-marker'),false);
 }}finally{providerBodyOverride=undefined;}
 assert.deepEqual((await db.doc('plants/local-ai-test').get()).data(),before);assert.equal((await db.doc('publicPlants/local-ai-test').get()).exists,false);
});

test('contenido con comentario intermedio y respuesta final estructurada queda listo con fuentes',async()=>{
 const before=(await db.doc('plants/local-ai-test').get()).data();const date=new Date().toISOString().slice(0,10);
 const proposal={name:'Pastora',description:'Recomendaciones básicas',categoryIds:['interior'],care:{light:'Luz indirecta',watering:'Riego moderado',humidity:'Ambiente normal',temperature:'Proteger del frío'},warnings:'',sources:[{title:'Fuente mock',url:'https://example.test/botany',accessedAt:date}],uncertainty:''};
 providerBodyOverride={status:'completed',output:[{type:'message',phase:'commentary',content:[{type:'output_text',text:'Consultaré fuentes botánicas.'}]},{type:'reasoning',content:null},{type:'web_search_call',action:{sources:[{type:'url',url:'https://example.test/botany'},{type:'other',title:'No URL'}]}},{type:'message',phase:'final_answer',status:'completed',content:[{type:'output_text',text:JSON.stringify(proposal),annotations:null}]}]};
 let captured;const transport=globalThis.fetch;const spy=mock.method(globalThis,'fetch',async(url,options)=>{if(new URL(String(url)).hostname==='api.openai.com')captured=JSON.parse(options.body);return transport(url,options);});
 try{
  const created=await call('requestAI',{plantId:'local-ai-test',revision:before.revision,kind:'content',confirmedName:'Pastora'});const calls=providerCalls;await run(created.jobId);await run(created.jobId);
  const job=(await db.doc('aiJobs/'+created.jobId).get()).data();assert.equal(job.status,'ready');assert.deepEqual(job.proposal,proposal);assert.equal(providerCalls,calls+1);assert.equal(captured.text.format.type,'json_schema');assert.equal(captured.text.format.strict,true);assert.equal(captured.max_output_tokens,3000);
 }finally{spy.mock.restore();providerBodyOverride=undefined;}
 assert.deepEqual((await db.doc('plants/local-ai-test').get()).data(),before);assert.equal((await db.doc('publicPlants/local-ai-test').get()).exists,false);
});
