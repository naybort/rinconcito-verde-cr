import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { getBlob, ref } from 'firebase/storage';
import { firebase } from '../../lib/firebase';
export function PrivatePhoto({path,label}:{path:string;label:string}){
 const [src,setSrc]=useState('');const [error,setError]=useState(false);
 useEffect(()=>{if(!firebase)return;let active=true;let url='';void getBlob(ref(firebase.storage,path)).then(blob=>{url=URL.createObjectURL(blob);if(active)setSrc(url);else URL.revokeObjectURL(url);}).catch(()=>{if(active)setError(true);});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[path]);
 return error?<Alert severity="warning">No se pudo cargar {label.toLowerCase()}.</Alert>:src?<Box component="img" src={src} alt={label} sx={{width:'100%',height:240,objectFit:'contain'}}/>:null;
}
