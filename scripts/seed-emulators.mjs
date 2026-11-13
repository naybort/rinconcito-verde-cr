import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';
const projectId=process.env.GCLOUD_PROJECT||'demo-rinconcito-verde';
if(!['demo-rinconcito-verde','demo-rinconcito-verde-tests'].includes(projectId))throw new Error('Solo proyectos demo locales autorizados.');
if(!/^127\.0\.0\.1:\d{1,5}$/.test(process.env.FIRESTORE_EMULATOR_HOST||'')||!/^127\.0\.0\.1:\d{1,5}$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST||'')||(process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==projectId))throw new Error('Seed permitido únicamente en emuladores localhost del proyecto demo-rinconcito-verde.');
initializeApp({projectId,storageBucket:projectId+'.appspot.com'});const db=getFirestore();const auth=getAuth();
for(const role of ['admin','editor','outsider']){
 const uid='local-'+role;try{await auth.getUser(uid);}catch{await auth.createUser({uid,email:role+'@example.test',password:'Local-test-123!'});}
 if(role!=='outsider'){await auth.setCustomUserClaims(uid,{role});await db.doc('adminUsers/'+uid).set({active:true,role});}
}
const data=JSON.parse(await readFile(new URL('../src/data/plants.json',import.meta.url),'utf8'));const taxonomy=JSON.parse(await readFile(new URL('../src/data/categories.json',import.meta.url),'utf8'));
for(const c of taxonomy.categories){if(!(await db.doc('categories/'+c.id).get()).exists){await db.doc('categories/'+c.id).create({...c,revision:1,active:true});await db.doc('publicCategories/'+c.id).set(c);}}
for(const p of data.plants){if((await db.doc('plants/'+p.id).get()).exists)continue;
 const plant={...p,careTemplateId:'',sources:[],warnings:'',originalPath:'',approvedImagePath:'',notes:'Migración local desde JSON; revisar fuentes antes de actualizar.',revision:1,publishedRevision:1,status:'published',updatedAt:new Date().toISOString(),updatedBy:'local-seed'};
 await db.doc('plants/'+p.id).create(plant);await db.doc('publicPlants/'+p.id).create({...p,available:true,sources:[],warnings:''});
}
console.log('Emuladores preparados: admin@example.test / editor@example.test. Contraseña local: Local-test-123!');
