import { useEffect, useState } from 'react';
import type { Catalog, Category, Plant } from './schema';
export function usePublicCatalog(fallback:Catalog){
 const [catalog,setCatalog]=useState(fallback);const [loading,setLoading]=useState(!!import.meta.env.VITE_FIREBASE_MODE);const [error,setError]=useState('');
 useEffect(()=>{
  if(!import.meta.env.VITE_FIREBASE_MODE)return;
  let cancelled=false;let stops:(()=>void)[]=[];let plants:Plant[]|null=null,categories:Category[]|null=null;
  const update=()=>{if(!cancelled&&plants&&categories){setCatalog({plants,categories});setLoading(false);setError('');}};
  const failed=()=>{if(!cancelled){setLoading(false);setError('No pudimos actualizar el catálogo. Mostramos la última versión disponible.');}};
  void Promise.all([import('../../lib/firebase'),import('firebase/firestore')]).then(([{firebase},{collection,onSnapshot}])=>{
   if(cancelled||!firebase)return;
   stops=[onSnapshot(collection(firebase.db,'publicPlants'),s=>{plants=s.docs.map(d=>d.data() as Plant);update();},failed),onSnapshot(collection(firebase.db,'publicCategories'),s=>{categories=s.docs.map(d=>d.data() as Category);update();},failed)];
  }).catch(failed);
  return()=>{cancelled=true;stops.forEach(stop=>stop());};
 },[]);return {catalog,loading,error};
}
