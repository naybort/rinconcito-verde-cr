import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp as clientApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth as adminAuth } from 'firebase-admin/auth';
const projectId=process.env.GCLOUD_PROJECT||'demo-rinconcito-verde';
if(!['demo-rinconcito-verde','demo-rinconcito-verde-tests'].includes(projectId))throw new Error('Proyecto de test inválido.');
const localPort=key=>{const match=/^127\.0\.0\.1:(\d{1,5})$/.exec(process.env[key]||'');if(!match)throw new Error('Tests solo contra emuladores locales.');return Number(match[1]);};
const authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST;localPort('FIREBASE_AUTH_EMULATOR_HOST');
initializeApp({projectId});const db=getFirestore();let env;const clients=[];const commands={};
const draft={id:'test-plant',name:'Planta de prueba',description:'Descripción revisada',categoryIds:['interior'],care:{light:'Indirecta',watering:'Moderado',humidity:'Normal',temperature:'Templada'},careTemplateId:'',sources:[],warnings:'',image:{src:'/images/sansevieria.png',alt:'Sansevieria'},originalPath:'',approvedImagePath:'',notes:'PRIVADO'};
const call=(role,action,payload,id=crypto.randomUUID())=>commands[role]({action,payload,requestId:id}).then(r=>r.data);
before(async()=>{
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:localPort('FIRESTORE_EMULATOR_HOST'),rules:await readFile('firestore.rules','utf8')},storage:{host:'127.0.0.1',port:localPort('FIREBASE_STORAGE_EMULATOR_HOST'),rules:await readFile('storage.rules','utf8')}});
 for(const role of ['admin','editor','outsider']){const app=clientApp({projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'},role);clients.push(app);const auth=getAuth(app);connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});await signInWithEmailAndPassword(auth,role+'@example.test','Local-test-123!');const f=getFunctions(app);connectFunctionsEmulator(f,'127.0.0.1',Number(process.env.RV_TEST_FUNCTIONS_PORT||15001));commands[role]=httpsCallable(f,'adminCommand');}
});
after(async()=>{await Promise.all(clients.map(deleteApp));await env.cleanup();});
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
 const {getStorage}=await import('firebase-admin/storage');const [created]=await getStorage().bucket(projectId+'.appspot.com').getFiles({prefix:`public/gallery-test/${requestId}`});assert.equal(created.length,0);
});
