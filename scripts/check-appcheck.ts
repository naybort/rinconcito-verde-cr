import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { productionProject as project, projectGcloudArgs } from './production-config.ts';

import { appCheckProviderName, type AppCheckProviderName } from '../src/lib/appCheckConfig.ts';

type Options = { appId: string; projectNumber: string; provider?: string; expectedSiteKey?: string; getAccessToken: () => string; fetcher?: typeof fetch };
export async function checkAppCheck({ appId, projectNumber, provider: requestedProvider, expectedSiteKey, getAccessToken, fetcher = globalThis.fetch }: Options) {
 if (!/^\d+$/.test(projectNumber) || !new RegExp('^1:' + projectNumber + ':web:[a-f0-9]+$', 'i').test(appId)) throw new Error('La app web no pertenece al número de proyecto confirmado. Ejecutar configure:online y revisar la configuración.');
 const provider = appCheckProviderName(requestedProvider);
 const enterprise = provider === 'recaptcha-enterprise';
 const resource = enterprise ? 'recaptchaEnterpriseConfig' : 'recaptchaV3Config';
 const fields = enterprise ? 'name,siteKey' : 'name,siteSecretSet';
 const name = `projects/${projectNumber}/apps/${appId}/${resource}`;
 const token = getAccessToken().trim();
 if (!token || /\s/.test(token)) throw new Error('gcloud no devolvió una sesión válida para consultar App Check.');
 let response: Response;
 try {
  response = await fetcher(`https://firebaseappcheck.googleapis.com/v1/projects/${projectNumber}/apps/${encodeURIComponent(appId)}/${resource}?fields=${fields}`, {
   method: 'GET', headers: { Authorization: 'Bearer ' + token, 'X-Goog-User-Project': project }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
 } catch { throw new Error('No se pudo consultar App Check. Revisar conexión y sesión gcloud; no se publicó nada.'); }
 if (response.status === 404) throw new Error('App Check ' + provider + ' no está configurado para esta app. Revisar el proveedor en Firebase Console > App Check.');
 if (response.status === 403) {
  const data = await response.json().catch(() => ({})) as { error?: { details?: { reason?: string }[] } };
  const reason = data.error?.details?.map(detail => detail.reason).find(value => ['SERVICE_DISABLED', 'USER_PROJECT_DENIED', 'IAM_PERMISSION_DENIED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT'].includes(value ?? ''));
  throw new Error('App Check devolvió HTTP 403' + (reason ? ' (' + reason + ')' : '') + '. Comprobar la API, firebaseappcheck.' + resource + '.get y serviceusage.services.use en el proyecto confirmado.');
 }
 if (!response.ok) throw new Error(`App Check devolvió HTTP ${response.status}. No se continúa con el despliegue.`);
 const config = await response.json() as { name?: string; siteSecretSet?: boolean; siteKey?: string };
 if (config.name !== name) throw new Error('App Check devolvió un registro distinto del solicitado; revisar el App ID antes de cambiar el proveedor.');
 if (enterprise) {
  if (!config.siteKey || !/^[a-zA-Z0-9_-]{10,200}$/.test(config.siteKey)) throw new Error('Falta la clave pública en el registro reCAPTCHA Enterprise de esta app.');
  if (expectedSiteKey !== undefined && config.siteKey !== expectedSiteKey) throw new Error('La clave pública de App Check no coincide con Enterprise. Ejecutar npm run check:appcheck -- --configure-enterprise.');
  return { appId, provider, configured: true as const, siteKey: config.siteKey };
 }
 if (config.siteSecretSet !== true) throw new Error('Falta completar el registro reCAPTCHA v3 de esta app en Firebase Console > App Check.');
 // Only metadata is requested. The API never returns the reCAPTCHA secret.
 return { appId, provider, configured: true } as const;
}
// Only two public values are synchronized. No remote configuration or local emulator file is changed.
export function saveEnterpriseAppCheck(root: string, result: { appId: string; provider: AppCheckProviderName; siteKey?: string }) {
 const config = loadEnv('production', root, 'VITE_');
 if (config.VITE_FIREBASE_PROJECT_ID !== project || config.VITE_FIREBASE_MODE !== 'cloud' || config.VITE_FIREBASE_APP_ID !== result.appId) throw new Error('La configuración local cambió o no corresponde a la app confirmada; no se guardó App Check.');
 if (result.provider !== 'recaptcha-enterprise' || !result.siteKey || !/^[a-zA-Z0-9_-]{10,200}$/.test(result.siteKey)) throw new Error('Registro Enterprise incompleto.');
 const target = join(root, '.env.production.local');
 const previous = readFileSync(target, 'utf8');
 const keys = ['VITE_FIREBASE_APPCHECK_PROVIDER', 'VITE_FIREBASE_APPCHECK_SITE_KEY'];
 const retained = previous.split(/\r?\n/).filter(line => !keys.some(key => new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=').test(line))).join('\n');
 const next = retained.trimEnd() + '\nVITE_FIREBASE_APPCHECK_PROVIDER=recaptcha-enterprise\nVITE_FIREBASE_APPCHECK_SITE_KEY=' + result.siteKey + '\n';
 if (next === previous) return;
 const backup = target + '.backup-' + randomUUID();
 writeFileSync(backup, previous, { flag: 'wx', mode: 0o600 });
 const temporary = target + '.tmp-' + randomUUID();
 try { writeFileSync(temporary, next, { flag: 'wx', mode: 0o600 }); renameSync(temporary, target); }
 finally { rmSync(temporary, { force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 const root = fileURLToPath(new URL('../', import.meta.url));
 try {
  const configureEnterprise = process.argv.length === 3 && process.argv[2] === '--configure-enterprise';
  if (process.argv.length !== 2 && !configureEnterprise) throw new Error('Uso: npm run check:appcheck [-- --configure-enterprise]');
  const config = loadEnv('production', root, 'VITE_');
  if (config.VITE_FIREBASE_PROJECT_ID !== project) throw new Error('Ejecutar configure:online para el proyecto confirmado antes de comprobar App Check.');
  const run = (args: string[]) => {
   const result = spawnSync('gcloud', projectGcloudArgs(args), { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
   if (result.error || result.status !== 0) throw new Error('gcloud no pudo completar la consulta. Revisar instalación, sesión y permisos del proyecto. No se muestran tokens ni datos de credenciales.');
   return result.stdout.trim();
  };
  const projectNumber = run(['projects', 'describe', project, '--format=value(projectNumber)']);
  const result = await checkAppCheck({ appId: config.VITE_FIREBASE_APP_ID ?? '', projectNumber, provider: configureEnterprise ? 'recaptcha-enterprise' : config.VITE_FIREBASE_APPCHECK_PROVIDER, expectedSiteKey: configureEnterprise ? undefined : (config.VITE_FIREBASE_APPCHECK_SITE_KEY ?? ''), getAccessToken: () => run(['auth', 'print-access-token']) });
  if (configureEnterprise) {
   saveEnterpriseAppCheck(root, result);
   console.log('Proveedor y clave pública Enterprise guardados en .env.production.local, con respaldo. Los emuladores y modelos se conservan.');
  }
  console.log('App Check configurado para ' + result.appId + ' (' + result.provider + '). Falta verificar el intercambio real de tokens desde el navegador.');
 } catch (error) { console.error(error instanceof Error ? error.message : 'No se pudo comprobar App Check.'); process.exitCode = 1; }
}
