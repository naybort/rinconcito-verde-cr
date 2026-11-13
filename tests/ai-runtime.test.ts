import { describe, it, expect, vi } from 'vitest';
import { aiRuntimeMode, assertAIEnabled, assertEmulatorIsolation, readAIKey, LOCAL_PROJECT, LOCAL_BUCKET } from '../functions/src/aiRuntime';
const isolated={FUNCTIONS_EMULATOR:'true',GCLOUD_PROJECT:LOCAL_PROJECT,FIREBASE_CONFIG:JSON.stringify({projectId:LOCAL_PROJECT,storageBucket:LOCAL_BUCKET}),FIRESTORE_EMULATOR_HOST:'127.0.0.1:18080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:19099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:19199',STORAGE_EMULATOR_HOST:'http://127.0.0.1:19199'};
const enabled={...isolated,AI_ENABLED:'true',AI_EMULATOR_OPENAI:'true',OPENAI_LOCAL_API_KEY:'test-only-local-value'};
describe('IA local: autorización explícita y aislamiento',()=>{
 it('permanece apagada por defecto y con un único indicador',()=>{
  expect(aiRuntimeMode(isolated)).toBe('disabled');
  expect(aiRuntimeMode({...isolated,AI_ENABLED:'true'})).toBe('disabled');
  expect(aiRuntimeMode({...isolated,AI_EMULATOR_OPENAI:'true'})).toBe('disabled');
  expect(aiRuntimeMode({...enabled,AI_ENABLED:'TRUE'})).toBe('disabled');
  expect(aiRuntimeMode(enabled)).toBe('local-openai');
 });
 it.each(['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST','STORAGE_EMULATOR_HOST'])('rechaza %s ausente, remoto, 0.0.0.0 o puerto inválido',key=>{
  for(const value of [undefined,'example.com:18080','0.0.0.0:18080','127.0.0.1:65536'])expect(()=>assertAIEnabled({...enabled,[key]:value})).toThrow(/local/);
 });
 it('rechaza proyecto real, bucket real y alias contradictorios antes de inicializar SDK',()=>{
  for(const patch of [{GCLOUD_PROJECT:'rinconcito-verde-cr'},{GOOGLE_CLOUD_PROJECT:'other'},{GOOGLE_CLOUD_QUOTA_PROJECT:'other'},{FIREBASE_CONFIG:'not-json'},{FIREBASE_CONFIG:JSON.stringify({projectId:LOCAL_PROJECT,storageBucket:'production.appspot.com'})},{FIREBASE_CONFIG:'null'}])expect(()=>assertEmulatorIsolation({...enabled,...patch})).toThrow();
 });
 it('sin clave local no admite trabajo ni lee el secreto productivo',()=>{
  const productionSecret=vi.fn(()=> 'test-only-production-value');
  expect(()=>readAIKey({...enabled,OPENAI_LOCAL_API_KEY:''},productionSecret)).toThrow('clave local');
  expect(()=>readAIKey({...enabled,OPENAI_LOCAL_API_KEY:undefined,OPENAI_API_KEY:'must-not-be-used'},productionSecret)).toThrow('clave local');
  expect(productionSecret).not.toHaveBeenCalled();
  expect(readAIKey(enabled,productionSecret)).toBe('test-only-local-value');expect(productionSecret).not.toHaveBeenCalled();
 });
 it('los indicadores locales no habilitan ni cambian los secretos de producción',()=>{
  const productionSecret=vi.fn(()=> 'test-only-production-value');
  expect(aiRuntimeMode({AI_EMULATOR_OPENAI:'true',OPENAI_LOCAL_API_KEY:'ignored'})).toBe('disabled');
  expect(readAIKey({AI_ENABLED:'true',AI_EMULATOR_OPENAI:'true',OPENAI_LOCAL_API_KEY:'ignored'},productionSecret)).toBe('test-only-production-value');expect(productionSecret).toHaveBeenCalledOnce();
 });
});

it('admite puertos locales alternativos para pruebas aisladas',()=>{expect(aiRuntimeMode({...enabled,FIRESTORE_EMULATOR_HOST:'127.0.0.1:28080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:29099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:29199',STORAGE_EMULATOR_HOST:'http://127.0.0.1:29199'})).toBe('local-openai');});
