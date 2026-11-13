// Backend only. Never import this module from the browser bundle.
export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;
export const LOCAL_PROJECT = 'demo-rinconcito-verde';
export const LOCAL_BUCKET = `${LOCAL_PROJECT}.appspot.com`;
export const LOCAL_TEST_PROJECT = 'demo-rinconcito-verde-tests';
const localEndpointKeys = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST'] as const;
function isLoopbackEndpoint(value: string | undefined): boolean {
  const match = /^127\.0\.0\.1:(\d{1,5})$/.exec(value || '');
  return !!match && Number(match[1]) > 0 && Number(match[1]) <= 65535;
}

export function assertEmulatorIsolation(env: RuntimeEnvironment): void {
  if (env.FUNCTIONS_EMULATOR !== 'true' || ![LOCAL_PROJECT, LOCAL_TEST_PROJECT].includes(env.GCLOUD_PROJECT || '')) {
    throw new Error('Los emuladores requieren el proyecto demo-rinconcito-verde.');
  }
  for (const key of ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_QUOTA_PROJECT']) {
    if (env[key] && env[key] !== env.GCLOUD_PROJECT) throw new Error('Proyecto incompatible con el entorno local.');
  }
  for (const key of localEndpointKeys) {
    if (!isLoopbackEndpoint(env[key])) throw new Error(`Emulador local ausente o inválido: ${key}.`);
  }
  if (env.STORAGE_EMULATOR_HOST !== `http://${env.FIREBASE_STORAGE_EMULATOR_HOST}`) throw new Error('Host de Storage local inconsistente.');
  let config: { projectId?: unknown; storageBucket?: unknown };
  try { config = JSON.parse(env.FIREBASE_CONFIG || '{}'); }
  catch { throw new Error('Configuración Firebase local inválida.'); }
  if (!config || config.projectId !== env.GCLOUD_PROJECT || config.storageBucket !== `${env.GCLOUD_PROJECT}.appspot.com`) {
    throw new Error('El proyecto y bucket locales deben pertenecer a demo-rinconcito-verde.');
  }
}

export function aiRuntimeMode(env: RuntimeEnvironment): 'disabled' | 'local-openai' | 'production' {
  if (env.AI_ENABLED !== 'true') return 'disabled';
  if (env.FUNCTIONS_EMULATOR !== 'true') return 'production';
  assertEmulatorIsolation(env);
  return env.AI_EMULATOR_OPENAI === 'true' ? 'local-openai' : 'disabled';
}

export function assertAIEnabled(env: RuntimeEnvironment): void {
  const mode = aiRuntimeMode(env);
  if (mode === 'disabled') throw new Error('IA desactivada. Podés continuar con el ingreso manual.');
  // Fail before admitting a billable job. Never return/log the key or fall back to a cloud secret.
  if (mode === 'local-openai' && !env.OPENAI_LOCAL_API_KEY?.trim()) {
    throw new Error('Falta configurar la clave local del backend. Revisá docs/LOCAL-AI.md.');
  }
}

export function readAIKey(env: RuntimeEnvironment, productionSecret: () => string): string {
  assertAIEnabled(env);
  return aiRuntimeMode(env) === 'local-openai' ? env.OPENAI_LOCAL_API_KEY!.trim() : productionSecret();
}

export function localFirebaseOptions(env: RuntimeEnvironment): {projectId:string;storageBucket:string} {
  assertEmulatorIsolation(env);
  return {projectId:env.GCLOUD_PROJECT!,storageBucket:`${env.GCLOUD_PROJECT}.appspot.com`};
}
