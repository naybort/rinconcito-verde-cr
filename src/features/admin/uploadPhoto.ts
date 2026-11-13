import { ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';

export const PHOTO_UPLOAD_TIMEOUT_MS = 30_000;
export class PhotoUploadTimeout extends Error {
 constructor(){super('La subida tardó más de 30 segundos y se canceló. Se conservó el borrador. Verificá la conexión y que Storage esté disponible, y volvé a seleccionar la foto.');}
}

export async function uploadOriginalPhoto(storage:FirebaseStorage,path:string,file:File):Promise<void>{
 const task=uploadBytesResumable(ref(storage,path),file,{contentType:file.type});
 let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{
  timer=setTimeout(()=>{reject(new PhotoUploadTimeout());task.cancel();},PHOTO_UPLOAD_TIMEOUT_MS);
 });
 try{await Promise.race([task,deadline]);}
 finally{clearTimeout(timer);}
}

export function photoUploadError(error:unknown):string{
 if(error instanceof PhotoUploadTimeout)return error.message;
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
 if(code==='storage/unauthorized'||code==='storage/unauthenticated')return 'No tenés permiso para subir la foto. Revisá tu sesión y acceso administrativo. Se conservó el borrador; podés volver a seleccionar la foto.';
 return 'No se pudo subir la fotografía. Se conservó el borrador. Verificá la conexión y que Storage esté disponible, y volvé a seleccionar la foto.';
}
