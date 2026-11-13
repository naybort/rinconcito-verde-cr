import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { productionProject as project } from './production-config.ts';

type Options = { appId: string; projectNumber: string; getAccessToken: () => string; fetcher?: typeof fetch };
export async function checkAppCheck({ appId, projectNumber, getAccessToken, fetcher = globalThis.fetch }: Options) {
 if (!/^\d+$/.test(projectNumber) || !new RegExp('^1:' + projectNumber + ':web:[a-f0-9]+$', 'i').test(appId)) throw new Error('La app web no pertenece al número de proyecto confirmado. Ejecutar configure:online y revisar la configuración.');
 const name = `projects/${projectNumber}/apps/${appId}/recaptchaV3Config`;
 const token = getAccessToken().trim();
 if (!token || /\s/.test(token)) throw new Error('gcloud no devolvió una sesión válida para consultar App Check.');
 let response: Response;
 try {
  response = await fetcher(`https://firebaseappcheck.googleapis.com/v1/projects/${projectNumber}/apps/${encodeURIComponent(appId)}/recaptchaV3Config?fields=name,siteSecretSet`, {
   method: 'GET', headers: { Authorization: 'Bearer ' + token, 'X-Goog-User-Project': project }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
 } catch { throw new Error('No se pudo consultar App Check. Revisar conexión y sesión gcloud; no se publicó nada.'); }
 if (response.status === 404) throw new Error('App Check reCAPTCHA v3 no está configurado para esta app. Registrar la app en Firebase Console > App Check.');
 if (response.status === 403) {
  const data = await response.json().catch(() => ({})) as { error?: { details?: { reason?: string }[] } };
  const reason = data.error?.details?.map(detail => detail.reason).find(value => ['SERVICE_DISABLED', 'USER_PROJECT_DENIED', 'IAM_PERMISSION_DENIED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT'].includes(value ?? ''));
  throw new Error('App Check devolvió HTTP 403' + (reason ? ' (' + reason + ')' : '') + '. Comprobar la API, firebaseappcheck.recaptchaV3Config.get y serviceusage.services.use en el proyecto confirmado.');
 }
 if (!response.ok) throw new Error(`App Check devolvió HTTP ${response.status}. No se continúa con el despliegue.`);
 const config = await response.json() as { name?: string; siteSecretSet?: boolean };
 if (config.name !== name || config.siteSecretSet !== true) throw new Error('Falta completar el registro reCAPTCHA v3 de esta app en Firebase Console > App Check.');
 // Only metadata is requested. The API never returns the reCAPTCHA secret.
 return { appId, provider: 'recaptcha-v3', configured: true } as const;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 const root = fileURLToPath(new URL('../', import.meta.url));
 try {
  if (process.argv.length !== 2) throw new Error('Uso: npm run check:appcheck');
  const config = loadEnv('production', root, 'VITE_');
  if (config.VITE_FIREBASE_PROJECT_ID !== project) throw new Error('Ejecutar configure:online para el proyecto confirmado antes de comprobar App Check.');
  const run = (args: string[]) => {
   const result = spawnSync('gcloud', [...args, '--project', project, '--quiet'], { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
   if (result.error || result.status !== 0) throw new Error('gcloud no pudo completar la consulta. Revisar instalación, sesión y permisos del proyecto. No se muestran tokens ni datos de credenciales.');
   return result.stdout.trim();
  };
  const projectNumber = run(['projects', 'describe', project, '--format=value(projectNumber)']);
  const result = await checkAppCheck({ appId: config.VITE_FIREBASE_APP_ID ?? '', projectNumber, getAccessToken: () => run(['auth', 'print-access-token']) });
  console.log('App Check configurado para ' + result.appId + ' (' + result.provider + '). Falta verificar el intercambio real de tokens desde el navegador.');
 } catch (error) { console.error(error instanceof Error ? error.message : 'No se pudo comprobar App Check.'); process.exitCode = 1; }
}
