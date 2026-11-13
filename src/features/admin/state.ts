import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import type { PlantRecord, Stock, Taxonomy } from '../../../functions/src/domain';
export type Job={id:string;plantId:string;revision:number;status:string;kind:string;error?:string;imagePath?:string;proposal?:Record<string,unknown>;additionalInstructions?:string;originalPath?:string;photoId?:string;baseApprovedImagePath?:string;createdAt?:string};
export type Movement={id:string;plantId:string;presentation:string;type:string;quantity:number;reason:string;actor:string;at:string};
export function useAdmin(){
 const [session,setSession]=useState<{user:User;role:'admin'|'editor'}|null>(null);
 const [loading,setLoading]=useState(!!firebase);const [error,setError]=useState('');
 const [plants,setPlants]=useState<PlantRecord[]>([]);const [categories,setCategories]=useState<Taxonomy[]>([]);const [careTemplates,setCareTemplates]=useState<Taxonomy[]>([]);const [stocks,setStocks]=useState<Stock[]>([]);const [movements,setMovements]=useState<Movement[]>([]);const [jobs,setJobs]=useState<Job[]>([]);
 useEffect(()=>{
  if(!firebase)return;let generation=0;
  return onAuthStateChanged(firebase.auth,async user=>{
   const current=++generation;setSession(null);setPlants([]);setStocks([]);setMovements([]);setCategories([]);setCareTemplates([]);setJobs([]);if(user)setError('');setLoading(!!user);
   if(!user)return;
   try{const token=await user.getIdTokenResult(true);const member=await getDoc(doc(firebase!.db,'adminUsers',user.uid));
    if(!member.data()?.active||!['admin','editor'].includes(String(token.claims.role))||member.data()?.role!==token.claims.role)throw new Error('Esta cuenta no tiene acceso administrativo.');
    if(current===generation)setSession({user,role:token.claims.role as 'admin'|'editor'});
   }catch{if(current===generation)setError('Esta cuenta no tiene acceso administrativo. Solicitá acceso al administrador.');await signOut(firebase!.auth);}
   finally{if(current===generation)setLoading(false);}
  });
 },[]);
 useEffect(()=>{
  if(!session||!firebase)return;
  const subscriptions:[string,(rows:never[])=>void][]=[['plants',setPlants],['categories',setCategories],['careTemplates',setCareTemplates],['stocks',setStocks],['movements',setMovements],['aiJobs',setJobs]];
  const stops=subscriptions.map(([name,set])=>onSnapshot(collection(firebase!.db,name),snapshot=>set(snapshot.docs.map(d=>({...d.data(),id:d.id})) as never[]),()=>{setError('No se pudieron cargar los datos privados. Verificá conexión y permisos.');set([]);}));
  return ()=>stops.forEach(stop=>stop());
 },[session]);
 return {session,loading,error,plants,categories,careTemplates,stocks,movements,jobs,setError};
}
