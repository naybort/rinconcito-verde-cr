import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { productionProject as project, firebaseResult } from './production-config.ts';

type App = { appId: string };
export function mergeProductionConfig(previous: string, config: Record<string, string>) {
 if (config.projectId !== project || !/^1:\d+:web:[a-f0-9]+$/i.test(config.appId ?? '') || !config.apiKey) throw new Error('Firebase no devolvió la configuración de una app web válida del proyecto confirmado.');
 if (config.authDomain !== project + '.firebaseapp.com' || ![project + '.firebasestorage.app', project + '.appspot.com'].includes(config.storageBucket)) throw new Error('El dominio o bucket recibido no corresponde al proyecto confirmado.');
 const values: Record<string, string> = { VITE_FIREBASE_MODE: 'cloud', VITE_FIREBASE_PROJECT_ID: project, VITE_FIREBASE_API_KEY: config.apiKey, VITE_FIREBASE_AUTH_DOMAIN: config.authDomain, VITE_FIREBASE_STORAGE_BUCKET: config.storageBucket, VITE_FIREBASE_APP_ID: config.appId, VITE_FIREBASE_REGION: 'us-central1' };
 for (const value of Object.values(values)) if (/[\r\n]/.test(value)) throw new Error('Configuración recibida inválida.');
 let result = previous.split(/\r?\n/).filter(line => !Object.keys(values).some(key => new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=').test(line))).join('\n').trimEnd();
 result += '\n' + Object.entries(values).map(([key, value]) => key + '=' + JSON.stringify(value)).join('\n') + '\n';
 for (const key of ['VITE_FIREBASE_APPCHECK_SITE_KEY', 'OPENAI_TEXT_MODEL', 'OPENAI_IMAGE_MODEL']) if (!new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=', 'm').test(result)) result += key + '=\n';
 return result.trimStart();
}
export function configureOnline(root: string, run?: (args: string[]) => string) {
 const firebase = run ?? ((args: string[]) => {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'), ...args], { cwd: root, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8', shell: false });
  if (result.error || result.status !== 0) throw new Error('Firebase no pudo completar la configuración. Revisar la sesión y la salida anterior; no repetir una creación si el resultado fue incierto.');
  return result.stdout;
 });
 const call = <T,>(args: string[]) => firebaseResult<T>(firebase([...args, '--project', project, '--json', '--non-interactive']));
 let apps = call<App[]>(['apps:list', 'WEB']);
 if (apps.length > 1) throw new Error('Hay varias apps web. Elegir la correcta en Firebase Console y completar .env.production.local; no se seleccionó una al azar.');
 if (apps.length === 0) apps = [call<App>(['apps:create', 'WEB', 'Rinconcito Verde Web'])];
 const { sdkConfig } = call<{ sdkConfig: Record<string, string> }>(['apps:sdkconfig', 'WEB', apps[0].appId]);
 const target = join(root, '.env.production.local');
 const previous = existsSync(target) ? readFileSync(target, 'utf8') : '# Configuración pública Firebase y nombres de modelos. La clave OpenAI va en Secret Manager.\n';
 const next = mergeProductionConfig(previous, sdkConfig);
 if (existsSync(target)) copyFileSync(target, target + '.backup-' + randomUUID());
 const temporary = target + '.tmp-' + randomUUID();
 try { writeFileSync(temporary, next, { flag: 'wx', mode: 0o600 }); renameSync(temporary, target); }
 finally { rmSync(temporary, { force: true }); }
 return { appId: sdkConfig.appId, file: target };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 try {
  if (process.argv.length !== 2) throw new Error('Uso: npm run configure:online');
  const result = configureOnline(fileURLToPath(new URL('../', import.meta.url)));
  console.log('App web configurada: ' + result.appId + '. Se guardó .env.production.local sin modificar .env.local ni emuladores.');
  console.log('Completar la clave pública App Check y los dos modelos. OPENAI_API_KEY se configura por separado en Secret Manager.');
 } catch (error) { console.error(error instanceof Error ? error.message : 'No se completó la configuración.'); process.exitCode = 1; }
}
