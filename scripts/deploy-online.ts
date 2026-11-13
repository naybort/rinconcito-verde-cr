import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { loadEnv } from 'vite';
import { checkAppCheck } from './check-appcheck.ts';
import { productionEnvironment, productionAIConfig, projectGcloudArgs, productionProject as project, productionOrigin as origin, firebaseResult } from './production-config.ts';

export type Command = { command: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv; capture: boolean };
type Run = (command: Command) => string;
const runCommand: Run = ({ command, args, cwd, env, capture }) => {
 const result = spawnSync(command, args, { cwd, env, shell: false, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
 if (result.error) throw new Error(`${command}: ${result.error.message}`);
 if (result.status !== 0) {
  if (capture && result.stderr) process.stderr.write(result.stderr);
  throw new Error(`${command} ${args[0] ?? ''} terminó con código ${result.status ?? 'desconocido'}. No se continúa con el despliegue.`);
 }
 return result.stdout ?? '';
};
type Options = { root: string; raw: Record<string, string>; ai?: Record<string, string>; ambient?: NodeJS.ProcessEnv; checkOnly?: boolean; withoutAppCheck?: boolean; run?: Run; fetcher?: typeof fetch; log?: (message: string) => void };
export async function deployOnline({ root, raw, ai = {}, ambient = process.env, checkOnly = false, withoutAppCheck = false, run = runCommand, fetcher = globalThis.fetch, log = console.log }: Options) {
 const env = productionEnvironment(raw, ambient, withoutAppCheck);
 const aiConfig = { ...productionAIConfig(ai), CATALOG_APPCHECK_ENFORCED: String(!withoutAppCheck) };
 if (withoutAppCheck) log('Pausa explícita de App Check para este despliegue. Se mantienen Authentication, roles, reglas y límites de IA.');
 const command = (program: string, args: string[], capture = false) => run({ command: program, args, cwd: root, env, capture });
 const gcloud = (args: string[]) => command('gcloud', projectGcloudArgs(args), true);
 const firebase = (args: string[], capture = false) => command(process.execPath, [join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'), ...args, '--project', project, '--non-interactive'], capture);
 const json = <T,>(args: string[]) => firebaseResult<T>(firebase([...args, '--json'], true));
 log('Comprobando sesión y configuración en ' + project + '…');
 const projects = json<{ projectId: string }[]>(['projects:list']);
 if (!projects.some(item => item.projectId === project)) throw new Error('La sesión Firebase no tiene acceso al proyecto confirmado.');
 const billing = JSON.parse(gcloud(['billing', 'projects', 'describe', project, '--format=json']));
 if (billing.billingEnabled !== true) throw new Error('El backend requiere Blaze ya habilitado. Este comando no vincula facturación.');
 const app = json<{ sdkConfig: Record<string, string> }>(['apps:sdkconfig', 'WEB', raw.VITE_FIREBASE_APP_ID]).sdkConfig;
 for (const [field, key] of [['projectId', 'VITE_FIREBASE_PROJECT_ID'], ['appId', 'VITE_FIREBASE_APP_ID'], ['apiKey', 'VITE_FIREBASE_API_KEY'], ['authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'], ['storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET']]) {
  if (app?.[field] !== raw[key]) throw new Error('La configuración Firebase no coincide en ' + key + '.');
 }
 json(['firestore:databases:get', '(default)']);
 const bucket = JSON.parse(gcloud(['storage', 'buckets', 'describe', 'gs://' + raw.VITE_FIREBASE_STORAGE_BUCKET, '--raw', '--format=json'])) as { name?: string; cors?: { origin?: string[]; method?: string[] }[] };
 if (bucket.name !== raw.VITE_FIREBASE_STORAGE_BUCKET) throw new Error('Storage no confirmó el bucket esperado.');
 for (const site of [origin, `https://${project}.firebaseapp.com`]) {
  if (!bucket.cors?.some(rule => rule.method?.includes('GET') && (rule.origin?.includes(site) || rule.origin?.includes('*')))) throw new Error('Falta CORS para descargar fotografías desde ' + site + '. Revisar storage.cors.json y docs/DEPLOY-ONLINE.md antes de publicar.');
 }
 const projectNumber = gcloud(['projects', 'describe', project, '--format=value(projectNumber)']).trim();
 if (!withoutAppCheck) await checkAppCheck({ appId: raw.VITE_FIREBASE_APP_ID, projectNumber, provider: raw.VITE_FIREBASE_APPCHECK_PROVIDER, expectedSiteKey: raw.VITE_FIREBASE_APPCHECK_SITE_KEY, getAccessToken: () => gcloud(['auth', 'print-access-token']), fetcher });
 // Firebase CLI skips this cross-service IAM check in non-interactive deployments.
 const storageRole = 'roles/firebaserules.firestoreServiceAgent';
 const storageAgent = `serviceAccount:service-${projectNumber}@gcp-sa-firebasestorage.iam.gserviceaccount.com`;
 const storageGrants = gcloud(['projects', 'get-iam-policy', project, '--flatten=bindings[].members', `--filter=bindings.role=${storageRole} AND bindings.members=${storageAgent}`, '--format=value(bindings.role,bindings.condition.expression)']);
 if (!storageGrants.split(/\r?\n/).some(line => line.trim() === storageRole)) throw new Error('Falta el permiso de las reglas de Storage para consultar Firestore, o requiere revisar una condición IAM. Comprobar ' + storageRole + ' en ' + storageAgent + '. Ver docs/DEPLOY-ONLINE.md antes de publicar.');
 const secret = JSON.parse(gcloud(['secrets', 'versions', 'describe', 'latest', '--secret=OPENAI_API_KEY', '--format=json']));
 if (secret.state !== 'ENABLED') throw new Error('OPENAI_API_KEY necesita una versión habilitada en Secret Manager. No se leyó el contenido del secreto.');
 const functions = json<{ id: string; region: string; platform: string; codebase?: string; labels?: Record<string, string> }[]>(['functions:list']);
 for (const fn of functions.filter(item => ['adminCommand', 'processAI'].includes(item.id))) {
  if (fn.region !== 'us-central1' || fn.platform !== 'gcfv2' || (fn.codebase ?? fn.labels?.['deployment-codebase'] ?? 'default') !== 'catalog') throw new Error('Hay una función con el mismo nombre en otra región, generación o codebase. Revisar la migración; no se forzará su reemplazo.');
 }
 log('Ejecutando lint, tipos, pruebas, catálogo y compilaciones…');
 command('npm', ['run', 'check']);
 command('npm', ['run', 'build:backend']);
 // Publishing an empty cloud catalog would hide the existing plants and break printed QR destinations.
 const plants = JSON.parse(readFileSync(join(root, 'src/data/plants.json'), 'utf8')).plants as { id: string }[];
 const categories = JSON.parse(readFileSync(join(root, 'src/data/categories.json'), 'utf8')).categories as { id: string }[];
 for (const [collection, rows] of [['publicPlants', plants], ['publicCategories', categories]] as const) for (const row of rows) {
  const response = await fetcher(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${collection}/${encodeURIComponent(row.id)}?key=${encodeURIComponent(raw.VITE_FIREBASE_API_KEY)}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Falta preparar o permitir la lectura pública de ${collection}/${row.id} (HTTP ${response.status}). Migrar preservando los IDs antes de sustituir el catálogo online.`);
 }
 if (checkOnly) { log('Comprobaciones completas. No se publicó nada.'); return; }
 const stateDirectory = join(root, '.firebase'); mkdirSync(stateDirectory, { recursive: true });
 const stage = mkdtempSync(join(stateDirectory, 'deploy-online-'));
 const steps: string[] = [];
 const report = { project, appCheckEnforced: !withoutAppCheck, sourceCommit: command('git', ['rev-parse', 'HEAD'], true).trim(), sourceDirty: !!command('git', ['status', '--porcelain', '--untracked-files=normal'], true).trim(), startedAt: new Date().toISOString(), steps, status: 'running', url: origin };
 const record = () => writeFileSync(join(stateDirectory, 'deploy-online-result.json'), JSON.stringify(report, null, 2) + '\n');
 record();
 try {
  // A temporary source prevents local AI settings, credentials or env files from reaching Functions.
  const functions = join(stage, 'functions'); mkdirSync(functions);
  cpSync(join(root, 'functions/lib'), join(functions, 'lib'), { recursive: true });
  for (const file of ['package.json', 'package-lock.json']) cpSync(join(root, 'functions', file), join(functions, file));
  symlinkSync(join(root, 'functions/node_modules'), join(functions, 'node_modules'), 'dir');
  writeFileSync(join(functions, '.env.' + project), Object.entries(aiConfig).map(([key, value]) => key + '=' + value).join('\n') + '\n');
  const config = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
  delete config.emulators;
  config.hosting = { ...config.hosting, site: project, public: join(root, 'dist') };
  config.firestore.rules = join(root, config.firestore.rules); config.firestore.indexes = join(root, config.firestore.indexes);
  config.storage.rules = join(root, config.storage.rules);
  config.functions = [{ source: 'functions', codebase: 'catalog', ignore: ['node_modules', '.git', '.env*', '.secret*', '*-debug.log'] }];
  const configPath = join(stage, 'firebase.json'); writeFileSync(configPath, JSON.stringify(config, null, 2));
  log('Publicando reglas e índices…');
  firebase(['deploy', '--only', 'firestore,storage', '--config', configPath]);
  steps.push('rules'); record();
  // Firebase requires --force to enable the worker's existing retry policy non-interactively.
  // Scope it to this single known endpoint; region/generation/codebase were checked above.
  log('Publicando el procesador IA y su referencia a Secret Manager…');
  firebase(['deploy', '--only', 'functions:catalog:processAI', '--config', configPath, '--force']);
  steps.push('ai-worker'); record();
  // Make the worker available before accepting new AI jobs through the admin callable.
  log('Publicando la función administrativa con IA habilitada…');
  firebase(['deploy', '--only', 'functions:catalog:adminCommand', '--config', configPath]);
  steps.push('backend'); record();
  log('Publicando Hosting después del backend completo…');
  firebase(['deploy', '--only', 'hosting', '--config', configPath]);
  steps.push('hosting'); record();
  const html = readFileSync(join(root, 'dist/index.html'), 'utf8').trim();
  for (const path of ['/', '/admin']) {
   let verified = false;
   for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetcher(origin + path, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.ok && (await response.text()).trim() === html) { verified = true; break; }
    if (attempt < 4) await delay(1500);
   }
   if (!verified) throw new Error('La publicación terminó, pero no se pudo verificar la versión exacta en ' + path + '. Revisar el informe; no repetir a ciegas.');
  }
  steps.push('https-version'); report.status = 'deployed'; record();
  log('Despliegue verificado: ' + origin + ' y ' + origin + '/admin. Revisar inicio/cierre de sesión con una cuenta autorizada.');
 } catch (error) {
  report.status = 'incomplete'; record(); throw error;
 } finally { rmSync(stage, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 const args = process.argv.slice(2);
 if (args.length === 1 && args[0] === '--help') console.log('Uso: npm run deploy:online [-- --check] [--without-app-check]\n--without-app-check pausa App Check solo en este despliegue; conserva sesión y roles. El despliegue normal lo vuelve a exigir.');
 else if (args.some(arg => !['--check', '--without-app-check'].includes(arg)) || new Set(args).size !== args.length) { console.error('Uso: npm run deploy:online [-- --check] [--without-app-check]'); process.exitCode = 2; }
 else {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try { await deployOnline({ root, raw: loadEnv('production', root, 'VITE_'), ai: loadEnv('production', root, ['OPENAI_TEXT_MODEL', 'OPENAI_IMAGE_MODEL']), checkOnly: args.includes('--check'), withoutAppCheck: args.includes('--without-app-check') }); }
  catch (error) { console.error(error instanceof Error ? error.message : 'No se completó el despliegue.'); process.exitCode = 1; }
 }
}
