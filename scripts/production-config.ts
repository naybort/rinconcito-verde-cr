import { appCheckProviderName } from '../src/lib/appCheckConfig.ts';
export const productionProject = 'rinconcito-verde-cr';
export const productionOrigin = `https://${productionProject}.web.app`;
// Scope resource selection and request quota separately; never change the operator's global config.
export function projectGcloudArgs(args: string[]) {
 return [...args, '--project', productionProject, '--billing-project', productionProject, '--quiet'];
}
const publicKeys = [
 'VITE_FIREBASE_MODE', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY',
 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_APP_ID',
 'VITE_FIREBASE_REGION', 'VITE_FIREBASE_APPCHECK_SITE_KEY', 'VITE_FIREBASE_APPCHECK_PROVIDER',
];
export function productionEnvironment(raw: Record<string, string>, ambient: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
 const provider = appCheckProviderName(raw.VITE_FIREBASE_APPCHECK_PROVIDER);
 const missing = publicKeys.filter(key => key !== 'VITE_FIREBASE_APPCHECK_PROVIDER' && !raw[key]?.trim());
 if (missing.length) throw new Error('Falta configuración pública de producción: ' + missing.join(', ') + '. Ver docs/DEPLOY-ONLINE.md.');
 if (raw.VITE_FIREBASE_MODE !== 'cloud') throw new Error('El despliegue online requiere VITE_FIREBASE_MODE=cloud; no se publica un build de emuladores.');
 if (raw.VITE_FIREBASE_PROJECT_ID !== productionProject) throw new Error('El destino debe ser ' + productionProject + '.');
 if (raw.VITE_FIREBASE_AUTH_DOMAIN !== productionProject + '.firebaseapp.com') throw new Error('Auth debe usar el dominio del proyecto confirmado.');
 if (![productionProject + '.firebasestorage.app', productionProject + '.appspot.com'].includes(raw.VITE_FIREBASE_STORAGE_BUCKET)) throw new Error('El bucket no corresponde al proyecto confirmado.');
 if (!/^1:\d+:web:[a-f0-9]+$/i.test(raw.VITE_FIREBASE_APP_ID)) throw new Error('VITE_FIREBASE_APP_ID debe ser el ID real de una app web de Firebase.');
 if (raw.VITE_FIREBASE_REGION !== 'us-central1') throw new Error('La región confirmada es us-central1; cambiarla requiere una migración.');
 for (const key of Object.keys(raw)) if (key.startsWith('VITE_') && !publicKeys.includes(key) && !key.startsWith('VITE_EMULATOR_')) throw new Error('Variable Vite no permitida para publicar: ' + key);
 for (const key of publicKeys) if (/^(demo|test|replace|todo|changeme|pendiente|completar)([-_ ]|$)/i.test(raw[key]) || /[<>\r\n]/.test(raw[key])) throw new Error('Reemplazar el valor de ejemplo en ' + key + '.');
 const env = { ...ambient };
 for (const key of Object.keys(env)) if (key.startsWith('VITE_') || key.startsWith('OPENAI_') || key.startsWith('AI_') || key.endsWith('_EMULATOR_HOST') || ['FIREBASE_EMULATOR_HUB', 'FUNCTIONS_EMULATOR', 'FIREBASE_APPCHECK_DEBUG_TOKEN'].includes(key)) delete env[key];
 for (const key of publicKeys) env[key] = raw[key];
 return { ...env, VITE_FIREBASE_APPCHECK_PROVIDER: provider, AI_ENABLED: 'false', AI_EMULATOR_OPENAI: 'false', CI: 'true' };
}
export function firebaseResult<T>(text: string): T {
 const response = JSON.parse(text) as { status: string; result: T };
 if (response.status !== 'success' || response.result === undefined) throw new Error('Firebase no confirmó la comprobación solicitada.');
 return response.result;
}

export function productionAIConfig(raw: Record<string, string>) {
 const textModel = raw.OPENAI_TEXT_MODEL?.trim(), imageModel = raw.OPENAI_IMAGE_MODEL?.trim();
 if (!textModel || !imageModel) throw new Error('El despliegue completo requiere OPENAI_TEXT_MODEL y OPENAI_IMAGE_MODEL en .env.production.local. La clave va en Secret Manager, no en este archivo.');
 for (const value of [textModel, imageModel]) if (!/^[a-z0-9][a-z0-9._:-]{1,127}$/i.test(value) || /^(sk-|demo-|test-|configured-|completar|pendiente)/i.test(value)) throw new Error('Usar IDs reales de modelos OpenAI; no claves ni valores de ejemplo.');
 return { AI_ENABLED: 'true', AI_EMULATOR_OPENAI: 'false', OPENAI_TEXT_MODEL: textModel, OPENAI_IMAGE_MODEL: imageModel };
}
