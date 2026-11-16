import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp as clientApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
const backendRequire=createRequire(process.env.RV_TEST_FUNCTIONS_SOURCE+'/package.json');
const {initializeApp}=backendRequire('firebase-admin/app');
const {getFirestore}=backendRequire('firebase-admin/firestore');
const {getAuth:adminAuth}=backendRequire('firebase-admin/auth');
const projectId=process.env.GCLOUD_PROJECT||'demo-rinconcito-verde';
if(!['demo-rinconcito-verde','demo-rinconcito-verde-tests'].includes(projectId))throw new Error('Proyecto de test inválido.');
const localPort=key=>{const match=/^127\.0\.0\.1:(\d{1,5})$/.exec(process.env[key]||'');if(!match)throw new Error('Tests solo contra emuladores locales.');return Number(match[1]);};
const authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST;localPort('FIREBASE_AUTH_EMULATOR_HOST');
const direct=process.env.RV_TEST_DIRECT_HANDLERS==='true';
if(direct)Object.assign(process.env,{FUNCTIONS_EMULATOR:'true',GCLOUD_PROJECT:projectId,GOOGLE_CLOUD_PROJECT:projectId,GOOGLE_CLOUD_QUOTA_PROJECT:projectId,FIREBASE_CONFIG:JSON.stringify({projectId,storageBucket:projectId+'.appspot.com'}),AI_ENABLED:'false',AI_EMULATOR_OPENAI:'false'});
const handlers=direct?await import(pathToFileURL(process.env.RV_TEST_FUNCTIONS_SOURCE+'/lib/index.js').href):null;
if(!direct)initializeApp({projectId});const db=getFirestore();let env,publicServer;let publicEndpoint;const clients=[];const commands={};
const draft={id:'test-plant',name:'Planta de prueba',description:'Descripción revisada',categoryIds:['interior'],care:{light:'Indirecta',watering:'Moderado',humidity:'Normal',temperature:'Templada'},careTemplateId:'',sources:[],warnings:'',image:{src:'/images/sansevieria.png',alt:'Sansevieria'},originalPath:'',approvedImagePath:'',notes:'PRIVADO'};
const call=(role,action,payload,id=crypto.randomUUID())=>commands[role]({action,payload,requestId:id}).then(r=>r.data);
before(async()=>{
 if(direct){const app=backendRequire('express')();app.use(handlers.getPublicLoadingSettings);publicServer=createServer(app);await new Promise(resolve=>publicServer.listen(0,'127.0.0.1',resolve));publicEndpoint=`http://127.0.0.1:${publicServer.address().port}`;}
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:localPort('FIRESTORE_EMULATOR_HOST'),rules:await readFile('firestore.rules','utf8')},storage:{host:'127.0.0.1',port:localPort('FIREBASE_STORAGE_EMULATOR_HOST'),rules:await readFile('storage.rules','utf8')}});
 for(const role of ['admin','editor','outsider']){const app=clientApp({projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'},role);clients.push(app);const auth=getAuth(app);connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});await signInWithEmailAndPassword(auth,role+'@example.test','Local-test-123!');const f=getFunctions(app);connectFunctionsEmulator(f,'127.0.0.1',Number(process.env.RV_TEST_FUNCTIONS_PORT||15001));commands[role]=direct?async data=>{const token=await adminAuth().verifyIdToken(await auth.currentUser.getIdToken());return {data:await handlers.adminCommand.run({auth:{uid:token.uid,token},data})};}:httpsCallable(f,'adminCommand');}
});
after(async()=>{await Promise.all(clients.map(deleteApp));await env.cleanup();if(publicServer)await new Promise(resolve=>publicServer.close(resolve));if(direct)await db.terminate();});
test('reglas: público lee fichas, no borradores; editor no puede escribir ni autootorgarse permisos',async()=>{
 const pub=env.unauthenticatedContext().firestore();const editor=env.authenticatedContext('local-editor',{role:'editor'}).firestore();
 await assertSucceeds(getDoc(doc(pub,'publicPlants/sansevieria')));await assertFails(getDoc(doc(pub,'plants/sansevieria')));
 await assertSucceeds(getDoc(doc(editor,'plants/sansevieria')));await assertFails(setDoc(doc(editor,'plants/hacked'),{name:'hack'}));await assertFails(setDoc(doc(editor,'adminUsers/local-editor'),{role:'admin',active:true}));
 const fake=env.authenticatedContext('not-allowed',{role:'admin'}).firestore();await assertFails(getDoc(doc(fake,'plants/sansevieria')));
});
test('backend: cuenta sin lista de acceso y editor no publican',async()=>{
 await assert.rejects(call('outsider','savePlant',{draft,revision:0}),/acceso administrativo/);
 await assert.rejects(call('editor','publish',{id:draft.id,revision:0}),/administrador/);
});
test('borrador, revisión, publicación y conflictos preservan copia pública',async()=>{
 const saved=await call('editor','savePlant',{draft,revision:0});assert.equal(saved.plant.revision,1);
 assert.equal((await db.doc('publicPlants/'+draft.id).get()).exists,false);
 await assert.rejects(call('editor','savePlant',{draft,revision:0}),/Otra persona/);
 await assert.rejects(call('admin','publish',{id:draft.id,revision:1}),/revisión/);
 await call('editor','review',{id:draft.id,revision:1});await call('admin','publish',{id:draft.id,revision:2});
 const pub=(await db.doc('publicPlants/'+draft.id).get()).data();assert.equal(pub.name,draft.name);assert.equal(pub.notes,undefined);assert.equal(pub.originalPath,undefined);
 await call('editor','savePlant',{draft:{...draft,name:'Nombre nuevo'},revision:3});assert.equal((await db.doc('publicPlants/'+draft.id).get()).data().name,draft.name);
});
test('stock: entrada 10, doble envío y payload alterado; historial una vez',async()=>{
 const move={plantId:draft.id,presentation:'general',type:'entry',quantity:10,reason:'Ingreso inicial'};const id=crypto.randomUUID();
 await Promise.all([call('editor','inventory',{items:[move]},id),call('editor','inventory',{items:[move]},id)]);
 const stock=(await db.doc(`stocks/${draft.id}--general`).get()).data();assert.equal(stock.available,10);
 assert.equal((await db.collection('movements').where('requestId','==',id).get()).size,1);
 await assert.rejects(call('editor','inventory',{items:[{...move,quantity:20}]},id),/otros datos/);
});
test('ventas concurrentes impiden saldo negativo y lote falla completo',async()=>{
 const move={plantId:draft.id,presentation:'general',type:'sale',quantity:7,reason:'Venta registrada'};
 const results=await Promise.allSettled([call('editor','inventory',{items:[move]}),call('editor','inventory',{items:[move]})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await db.doc(`stocks/${draft.id}--general`).get()).data().available,3);
 await assert.rejects(call('editor','inventory',{items:[{...move,type:'entry',quantity:10},{...move,presentation:'other',quantity:1}]}));assert.equal((await db.doc(`stocks/${draft.id}--general`).get()).data().available,3);
});
test('reservas, liberación, venta reservada y ajuste conservan cantidades',async()=>{
 const item={plantId:draft.id,presentation:'general',quantity:2,reason:'Control de reservas'};
 await call('editor','inventory',{items:[{...item,type:'reserve'}]});await call('editor','inventory',{items:[{...item,type:'release',quantity:1}]});await call('editor','inventory',{items:[{...item,type:'reserved-sale',quantity:1}]});
 const s=(await db.doc(`stocks/${draft.id}--general`).get()).data();assert.equal(s.available,2);assert.equal(s.reserved,0);
 await assert.rejects(call('editor','inventory',{items:[{...item,type:'adjust',quantity:-3}]}));
});
test('archivar mantiene URL y cuidados; restaurar no publica',async()=>{
 await call('admin','archive',{id:draft.id,revision:4});assert.equal((await db.doc('publicPlants/'+draft.id).get()).data().available,false);
 assert.equal((await db.doc('publicPlants/'+draft.id).get()).data().care.light,'Indirecta');await call('admin','restore',{id:draft.id,revision:5});assert.equal((await db.doc('plants/'+draft.id).get()).data().status,'draft');
});
test('IA desactivada rechaza trabajos sin modificar borrador ni stock',async()=>{
 await assert.rejects(call('editor','requestAI',{plantId:draft.id,revision:6,kind:'identify',confirmedName:''}),/IA desactivada/);assert.equal((await db.doc('plants/'+draft.id).get()).data().revision,6);
});
test('almacenamiento: originales privados, límite, formato, no reemplazo ni derivados públicos escritos por cliente',async()=>{
 const storage=env.authenticatedContext('local-editor',{role:'editor'}).storage();const path='originals/local-editor/test-plant/test-image';const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
 await assertSucceeds(uploadBytes(ref(storage,path),bytes,{contentType:'image/png'}));await assertFails(uploadBytes(ref(storage,path),bytes,{contentType:'image/png'}));
 await assertSucceeds(getBytes(ref(storage,path)));await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),path)));
 await assertFails(uploadBytes(ref(storage,'originals/local-admin/test-plant/wrong-owner'),bytes,{contentType:'image/png'}));await assertFails(uploadBytes(ref(storage,'public/test-plant/test'),bytes,{contentType:'image/png'}));await assertFails(uploadBytes(ref(storage,'originals/local-editor/test-plant/bad'),bytes,{contentType:'text/html'}));
 await assertFails(uploadBytes(ref(storage,'originals/local-editor/test-plant/large'),new Uint8Array(10*1024*1024+1),{contentType:'image/png'}));
});
test('revocación inmediata bloquea reglas y backend aun con token existente',async()=>{
 await db.doc('adminUsers/local-editor').update({active:false});
 await assert.rejects(call('editor','savePlant',{draft,revision:6}),/acceso/);await assertFails(getDoc(doc(env.authenticatedContext('local-editor',{role:'editor'}).firestore(),'plants/'+draft.id)));
 await db.doc('adminUsers/local-editor').update({active:true});await adminAuth().setCustomUserClaims('local-editor',{role:'editor'});
});
test('cuidados compartidos muestran referencias pero no cambian contenido público ni borradores automáticamente',async()=>{
 const care={light:'Nueva luz',watering:'Nuevo riego',humidity:'Nueva humedad',temperature:'Nueva temperatura'};
 await call('admin','saveTaxonomy',{kind:'careTemplates',id:'shared-care',name:'Plantilla compartida',active:true,revision:0,care,sources:[]});
 const updated={...draft,careTemplateId:'shared-care'};await call('editor','savePlant',{draft:updated,revision:6});
 await call('admin','saveTaxonomy',{kind:'careTemplates',id:'shared-care',name:'Plantilla compartida',active:true,revision:1,care:{...care,light:'Otro cambio'},sources:[]});
 assert.equal((await db.doc('plants/'+draft.id).get()).data().care.light,'Indirecta');assert.equal((await db.doc('publicPlants/'+draft.id).get()).data().care.light,'Indirecta');
 await assert.rejects(call('editor','saveTaxonomy',{kind:'categories',id:'hacked',name:'No autorizado',active:true,revision:0}),/administrador/);
});

test('galería: originales privados, portada ordenada y publicación idempotente sin campos internos',async()=>{
 const storage=env.authenticatedContext('local-editor',{role:'editor'}).storage('gs://'+projectId+'.appspot.com');
 const photos=[];const bytes=[];
 for(const [i,name] of ['monstera','calathea'].entries()){
  const data=await readFile(`tests/fixtures/images/${name}.png`);bytes.push(data);const originalPath=`originals/local-editor/gallery-test/photo-${i}`;
  await uploadBytes(ref(storage,originalPath),data,{contentType:'image/png'});photos.push({image:{src:'',alt:'Foto '+name},originalPath,approvedImagePath:''});
 }
 const value={...draft,id:'gallery-test',name:'Galería de prueba',...photos[0],gallery:[photos[1]]};
 await call('editor','savePlant',{draft:value,revision:0});await call('editor','review',{id:value.id,revision:1});
 const requestId=crypto.randomUUID();await Promise.all([call('admin','publish',{id:value.id,revision:2},requestId),call('admin','publish',{id:value.id,revision:2},requestId)]);
 let pub=(await db.doc('publicPlants/'+value.id).get()).data();assert.equal(pub.images.length,2);assert.deepEqual(pub.image,pub.images[0]);assert.equal(JSON.stringify(pub).includes('originals/'),false);assert.equal(pub.gallery,undefined);assert.equal(pub.ai,undefined);assert.equal(pub.notes,undefined);
 for(const [i,image] of pub.images.entries()){assert.equal(new URL(image.src).hostname,'127.0.0.1');const response=await globalThis.fetch(image.src);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes[i]);}
 await assertFails(getBytes(ref(env.unauthenticatedContext().storage('gs://'+projectId+'.appspot.com'),photos[1].originalPath)));
 await call('editor','savePlant',{draft:{...value,...photos[1],gallery:[photos[0]]},revision:3});await call('editor','review',{id:value.id,revision:4});await call('admin','publish',{id:value.id,revision:5});pub=(await db.doc('publicPlants/'+value.id).get()).data();assert.equal(pub.image.alt,'Foto calathea');assert.equal(pub.images[1].alt,'Foto monstera');
 await assert.rejects(call('editor','savePlant',{draft:{...value,gallery:[{...photos[1],originalPath:'originals/local-editor/another-ficha/photo'}]},revision:6}),/Referencia de foto/);
 await assert.rejects(call('editor','savePlant',{draft:{...value,gallery:[photos[0]]},revision:6}),/misma fotografía/);
});
test('una foto adicional inválida no sustituye la galería publicada ni expone copias parciales',async()=>{
 const current=(await db.doc('plants/gallery-test').get()).data();const {revision,status,updatedAt,updatedBy,publishedRevision,...value}=current;void status;void updatedAt;void updatedBy;void publishedRevision;
 const previous=(await db.doc('publicPlants/gallery-test').get()).data();const bad='originals/local-editor/gallery-test/bad-image';
 await uploadBytes(ref(env.authenticatedContext('local-editor',{role:'editor'}).storage('gs://'+projectId+'.appspot.com'),bad),new Uint8Array([1,2,3]),{contentType:'image/png'});
 await call('editor','savePlant',{draft:{...value,gallery:[...value.gallery,{image:{src:'',alt:'Archivo inválido'},originalPath:bad,approvedImagePath:''}]},revision});
 await call('editor','review',{id:value.id,revision:revision+1});const requestId=crypto.randomUUID();await assert.rejects(call('admin','publish',{id:value.id,revision:revision+2},requestId),/imagen admitida/);
 assert.deepEqual((await db.doc('publicPlants/gallery-test').get()).data(),previous);
 const {getStorage}=backendRequire('firebase-admin/storage');const [created]=await getStorage().bucket(projectId+'.appspot.com').getFiles({prefix:`public/gallery-test/${requestId}`});assert.equal(created.length,0);
});

test('presentaciones: datos parciales conservan stock y precio público exige autorización publicada',async()=>{
 const plant={...draft,id:'price-test',showPrice:true};
 await call('editor','savePlant',{draft:plant,revision:0});
 await call('editor','presentation',{plantId:plant.id,presentation:'mediana',priceCRC:4500,potNumber:'12',location:'Estante privado'});
 await call('editor','inventory',{items:[{plantId:plant.id,presentation:'mediana',type:'entry',quantity:10,reason:'Existencia inicial'}]});
 await call('editor','presentation',{plantId:plant.id,presentation:'grande',priceCRC:8000,potNumber:'18'});
 await call('editor','review',{id:plant.id,revision:1});await call('admin','publish',{id:plant.id,revision:2});
 const pubRef=db.doc('publicPlants/'+plant.id),stockRef=db.doc(`stocks/${plant.id}--mediana`);
 let pub=(await pubRef.get()).data();assert.equal(pub.priceOptions.length,2);assert.equal(JSON.stringify(pub).includes('Estante privado'),false);
 await call('editor','presentation',{plantId:plant.id,presentation:'mediana',potNumber:'14'});
 assert.deepEqual((await stockRef.get()).data(),{plantId:plant.id,presentation:'mediana',available:10,reserved:0,priceCRC:4500,potNumber:'14',location:'Estante privado'});
 assert.deepEqual((await pubRef.get()).data().priceOptions.find(row=>row.presentation==='mediana'),{presentation:'mediana',priceCRC:4500,potNumber:'14'});
 await call('editor','presentation',{plantId:plant.id,presentation:'mediana',priceCRC:null});
 assert.equal((await pubRef.get()).data().priceOptions.length,1);assert.equal((await stockRef.get()).data().available,10);
 await call('editor','savePlant',{draft:{...plant,showPrice:false},revision:3});
 await call('editor','review',{id:plant.id,revision:4});await call('admin','publish',{id:plant.id,revision:5});
 await call('editor','presentation',{plantId:plant.id,presentation:'mediana',priceCRC:6000});
 pub=(await pubRef.get()).data();assert.equal(pub.priceOptions,undefined);assert.equal(pub.showPrice,undefined);
 await call('admin','archive',{id:plant.id,revision:6});
 await assert.rejects(call('editor','presentation',{plantId:plant.id,presentation:'mediana',priceCRC:9999}),/archivada/);
 assert.equal((await stockRef.get()).data().priceCRC,6000);
});

test('claves heredadas ambiguas no permiten sobrescribir inventario de otra ficha',async()=>{
 for(const id of ['collision--a','collision'])await call('editor','savePlant',{draft:{...draft,id},revision:0});
 await call('editor','presentation',{plantId:'collision--a',presentation:'b',priceCRC:1500});
 for(const [action,payload] of [
  ['presentation',{plantId:'collision',presentation:'a--b',priceCRC:1}],
  ['inventory',{items:[{plantId:'collision',presentation:'a--b',type:'entry',quantity:100,reason:'Colisión de claves'}]}]
 ])await assert.rejects(call('editor',action,payload),/otra ficha/);
 assert.equal((await db.doc('stocks/collision--a--b').get()).data().priceCRC,1500);
 assert.equal((await db.doc('stocks/collision--a--b').get()).data().available,0);
});

test('fuentes: el servidor rechaza evidencia inventada y acepta solo un trabajo correspondiente',async()=>{
 const id='sources-test';const source={title:'Fuente de prueba',url:'https://example.test/species',accessedAt:'2026-11-16',verification:'verified'};
 const value={...draft,id,sources:[source],ai:{confirmedName:'Sansevieria',instructions:{identify:'',content:'',enhance:''}}};
 let result=await call('editor','savePlant',{draft:value,revision:0});assert.equal(result.plant.sources[0].verification,'unverified');
 const jobId=crypto.randomUUID();await db.doc('aiJobs/'+jobId).set({kind:'content',status:'ready',plantId:id,revision:1,confirmedName:'Sansevieria',proposal:{sources:[source]}});
 result=await call('editor','savePlant',{draft:{...value,ai:{...value.ai,contentJobId:jobId}},revision:1});assert.equal(result.plant.sources[0].verification,'verified');
 result=await call('editor','savePlant',{draft:{...value,sources:[{...source,title:'Una cita alterada'}]},revision:2});assert.equal(result.plant.sources[0].verification,'unverified');
});

test('carga pública: administración versionada, consejos revisados y originales privados',async()=>{
 const current=await call('admin','getLoadingSettings',{});assert.equal(current.settings.revision,0);
 await assert.rejects(call('editor','getLoadingSettings',{}),/administrador/);
 const settings={...current.settings,title:'Nuestro vivero',tips:[{id:'public-tip',text:'Revisá la humedad antes de regar.',active:true,reviewed:true},{id:'private-tip',text:'Texto aún pendiente',active:false,reviewed:false}]};
 const requestId=crypto.randomUUID();const a=await call('admin','saveLoadingSettings',settings,requestId);const b=await call('admin','saveLoadingSettings',settings,requestId);assert.equal(a.settings.revision,1);assert.deepEqual(a,b);
 await assert.rejects(call('admin','saveLoadingSettings',settings),/Otra persona/);
 await assert.rejects(call('admin','saveLoadingSettings',{...a.settings,tips:[{...settings.tips[1],active:true}]}));
 await assert.rejects(call('editor','saveLoadingSettings',a.settings),/administrador/);
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'siteSettings/publicLoading')));
 await assertFails(getDoc(doc(env.authenticatedContext('local-editor',{role:'editor'}).firestore(),'siteSettings/publicLoading')));
 const url=publicEndpoint??`http://127.0.0.1:${process.env.RV_TEST_FUNCTIONS_PORT||15001}/${projectId}/us-central1/getPublicLoadingSettings`;
 const response=await globalThis.fetch(url);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/max-age=60/);
 const publicCopy=await response.json();assert.deepEqual(publicCopy.tips,['Revisá la humedad antes de regar.']);assert.equal(publicCopy.revision,undefined);assert.equal(publicCopy.updatedBy,undefined);
 assert.equal((await globalThis.fetch(url,{method:'POST'})).status,405);
 await assert.rejects(call('admin','requestLoadingTips',{prompt:'Proponer un consejo'}),/IA desactivada/);
});
