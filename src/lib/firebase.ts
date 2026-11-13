import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { initializeAppCheck, getToken, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { appCheckFailureMessage, appCheckProviderName } from './appCheckConfig';
const env=import.meta.env;
export const firebaseMode=env.VITE_FIREBASE_MODE as string|undefined;
function configure(){
 if(!firebaseMode)return null;
 const local=firebaseMode==='emulator';
 if(local&&(!['localhost','127.0.0.1'].includes(location.hostname)||!['demo-rinconcito-verde','demo-rinconcito-verde-tests'].includes(env.VITE_FIREBASE_PROJECT_ID)||env.VITE_FIREBASE_STORAGE_BUCKET!==env.VITE_FIREBASE_PROJECT_ID+'.appspot.com'))throw new Error('Los emuladores requieren localhost, el proyecto demo-rinconcito-verde y su bucket local.');
 if(!local&&firebaseMode!=='cloud')throw new Error('Modo Firebase inválido.');
 const app=initializeApp({projectId:env.VITE_FIREBASE_PROJECT_ID,apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,storageBucket:env.VITE_FIREBASE_STORAGE_BUCKET,appId:env.VITE_FIREBASE_APP_ID});
 let appCheck: ReturnType<typeof initializeAppCheck> | null = null;
 if(!local&&env.VITE_FIREBASE_APPCHECK_ENABLED!=='false'&&env.VITE_FIREBASE_APPCHECK_SITE_KEY){
  const Provider=appCheckProviderName(env.VITE_FIREBASE_APPCHECK_PROVIDER)==='recaptcha-enterprise'?ReCaptchaEnterpriseProvider:ReCaptchaV3Provider;
  appCheck=initializeAppCheck(app,{provider:new Provider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
 }
 const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app),functions=getFunctions(app,env.VITE_FIREBASE_REGION||'us-central1');
 if(local){
  const port=(key:string,fallback:number)=>{const n=Number(env[key]||fallback);if(!Number.isInteger(n)||n<1||n>65535)throw new Error('Puerto local inválido.');return n;};
  connectAuthEmulator(auth,'http://127.0.0.1:'+port('VITE_EMULATOR_AUTH_PORT',19099),{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',port('VITE_EMULATOR_FIRESTORE_PORT',18080));
  connectStorageEmulator(storage,'127.0.0.1',port('VITE_EMULATOR_STORAGE_PORT',19199));
  connectFunctionsEmulator(functions,'127.0.0.1',port('VITE_EMULATOR_FUNCTIONS_PORT',15001));
 }
 return {auth,db,storage,functions,appCheck};
}
export const firebase=configure();
export async function command<T=Record<string,unknown>>(action:string,payload:unknown,requestId:string):Promise<T>{
 if(!firebase)throw new Error('Firebase no está configurado.');
 // The callable SDK silently drops App Check after an exchange failure. Surface
 // that failure before any mutation, using the cached token without forcing refresh.
 if(firebaseMode==='cloud'&&env.VITE_FIREBASE_APPCHECK_ENABLED!=='false'){
  if(!firebase.appCheck)throw new Error('Falta configurar App Check para guardar cambios. No se envió la operación.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
   const result=await Promise.race([
    getToken(firebase.appCheck),
    new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject({code:'appCheck/timeout'}),20000);}),
   ]);
   if(!result.token)throw {code:'appCheck/token-missing'};
  } catch(error){
   // eslint-disable-next-line preserve-caught-error -- SDK causes may contain credentials; retain only approved code/status.
   throw new Error(appCheckFailureMessage(error));
  }
  finally{clearTimeout(timer);}
 }
 const response=await httpsCallable<unknown,T>(firebase.functions,'adminCommand')({action,payload,requestId});return response.data;
}
