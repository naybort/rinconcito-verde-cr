// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deployOnline, type Command } from '../scripts/deploy-online';
import { productionEnvironment, productionOrigin, productionAIConfig } from '../scripts/production-config';

const raw = {
 VITE_FIREBASE_MODE: 'cloud', VITE_FIREBASE_PROJECT_ID: 'rinconcito-verde-cr',
 VITE_FIREBASE_API_KEY: 'fixture-public-web-key', VITE_FIREBASE_AUTH_DOMAIN: 'rinconcito-verde-cr.firebaseapp.com',
 VITE_FIREBASE_STORAGE_BUCKET: 'rinconcito-verde-cr.firebasestorage.app', VITE_FIREBASE_APP_ID: '1:123456:web:abc123',
 VITE_FIREBASE_REGION: 'us-central1', VITE_FIREBASE_APPCHECK_SITE_KEY: 'fixture-public-site-key',
};
let root: string;
const html = '<!doctype html><html><body>Built fixture</body></html>';
beforeEach(() => {
 root = mkdtempSync(join(tmpdir(), 'rv-deploy-test-'));
 for (const path of ['src/data', 'dist', 'functions/lib', 'functions/node_modules']) mkdirSync(join(root, path), { recursive: true });
 for (const [path, data] of Object.entries({
  'src/data/plants.json': { plants: [{ id: 'sansevieria' }] },
  'src/data/categories.json': { categories: [{ id: 'interior' }] },
  'functions/package.json': { main: 'lib/index.js' }, 'functions/package-lock.json': { lockfileVersion: 3 },
  'firebase.json': { hosting: { public: 'dist', rewrites: [{ source: '**', destination: '/index.html' }] }, firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' }, storage: { rules: 'storage.rules' }, emulators: { auth: { port: 19099 } } },
 })) writeFileSync(join(root, path), JSON.stringify(data));
 writeFileSync(join(root, 'dist/index.html'), html);
 writeFileSync(join(root, 'functions/lib/index.js'), 'export const fixture = true;');
 writeFileSync(join(root, 'functions/.env.local'), 'AI_ENABLED=true\nOPENAI_LOCAL_API_KEY=private-fixture-do-not-copy\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
function runtime(options: { fail?: string; billing?: boolean; missingPlant?: boolean; smokeFailure?: boolean; secretEnabled?: boolean; foreignWorker?: boolean; missingCors?: boolean } = {}) {
 const calls: Command[] = [];
 const run = vi.fn((command: Command) => {
  calls.push(command);
  const args = command.args;
  if (options.fail && args.includes(options.fail)) throw new Error('simulated ' + options.fail);
  if (args.includes('projects:list')) return JSON.stringify({ status: 'success', result: [{ projectId: raw.VITE_FIREBASE_PROJECT_ID }] });
  if (args.includes('secrets')) return JSON.stringify({ state: options.secretEnabled === false ? 'DISABLED' : 'ENABLED' });
  if (args.includes('functions:list')) return JSON.stringify({ status: 'success', result: options.foreignWorker ? [{ id: 'processAI', region: 'europe-west1', platform: 'gcfv2', codebase: 'catalog' }] : [] });
  if (args.includes('buckets')) return JSON.stringify({ name: raw.VITE_FIREBASE_STORAGE_BUCKET, cors: options.missingCors ? [] : [{ origin: [productionOrigin, 'https://rinconcito-verde-cr.firebaseapp.com'], method: ['GET'] }] });
  if (args.includes('billing')) return JSON.stringify({ billingEnabled: options.billing !== false });
  if (args.includes('apps:sdkconfig')) return JSON.stringify({ status: 'success', result: { sdkConfig: { projectId: raw.VITE_FIREBASE_PROJECT_ID, appId: raw.VITE_FIREBASE_APP_ID, apiKey: raw.VITE_FIREBASE_API_KEY, authDomain: raw.VITE_FIREBASE_AUTH_DOMAIN, storageBucket: raw.VITE_FIREBASE_STORAGE_BUCKET } } });
  if (args.includes('firestore:databases:get')) return JSON.stringify({ status: 'success', result: { name: '(default)' } });
  if (args.includes('--format=value(projectNumber)')) return '123456';
  if (args.includes('print-access-token')) return 'fixture-gcloud-session';
  if (args.includes('deploy')) {
   const config = JSON.parse(readFileSync(args[args.indexOf('--config') + 1], 'utf8'));
   expect(config.emulators).toBeUndefined(); expect(config.hosting.site).toBe(raw.VITE_FIREBASE_PROJECT_ID);
   const stage = join(args[args.indexOf('--config') + 1], '../functions');
   expect(existsSync(join(stage, '.env.local'))).toBe(false);
   expect(readFileSync(join(stage, '.env.' + raw.VITE_FIREBASE_PROJECT_ID), 'utf8')).toContain('AI_ENABLED=true');
   expect(readFileSync(join(stage, '.env.' + raw.VITE_FIREBASE_PROJECT_ID), 'utf8')).toContain('OPENAI_TEXT_MODEL=gpt-6.1-terra');
   expect(readFileSync(join(stage, '.env.' + raw.VITE_FIREBASE_PROJECT_ID), 'utf8')).not.toContain('OPENAI_API_KEY=');
   expect(readFileSync(join(root, 'functions/.env.local'), 'utf8')).toContain('AI_ENABLED=true');
  }
  return args.includes('rev-parse') ? 'fixture-commit' : '';
 });
 const fetcher = vi.fn(async (url: string | URL | Request) => {
  if (String(url).startsWith('https://firebaseappcheck.googleapis.com')) return new Response(JSON.stringify({ name: `projects/123456/apps/${raw.VITE_FIREBASE_APP_ID}/recaptchaV3Config`, siteSecretSet: true }));
  if (String(url).startsWith('https://firestore.googleapis.com')) return new Response('{}', { status: options.missingPlant ? 404 : 200 });
  if (options.smokeFailure) throw new Error('simulated HTTPS verification failure');
  return new Response(html);
 }) as unknown as typeof fetch;
 return { calls, run, fetcher, log: vi.fn(), root, raw, ai: { OPENAI_TEXT_MODEL: 'gpt-6.1-terra', OPENAI_IMAGE_MODEL: 'gpt-image-2.6-sunburst' }, ambient: {} };
}
it('publica reglas y procesador antes del admin y Hosting, y verifica ambas URL exactas', async () => {
 const context = runtime(); await deployOnline(context);
 expect(context.calls.some(command => command.args.includes('appcheck:apps:list'))).toBe(false);
 const deploys = context.calls.filter(c => c.args.includes('deploy'));
 expect(deploys.map(c => c.args[c.args.indexOf('--only') + 1])).toEqual(['firestore,storage', 'functions:catalog:processAI', 'functions:catalog:adminCommand', 'hosting']);
 for (const command of deploys) {
  expect(command.args).toContain('--non-interactive');
  expect(command.args.includes('--force')).toBe(command.args.includes('functions:catalog:processAI'));
  expect(command.args[command.args.indexOf('--project') + 1]).toBe('rinconcito-verde-cr');
 }
 expect(context.fetcher).toHaveBeenCalledWith(productionOrigin + '/admin', expect.any(Object));
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8'))).toMatchObject({ status: 'deployed', steps: ['rules', 'ai-worker', 'backend', 'hosting', 'https-version'] });
 expect(readdirSync(join(root, '.firebase'))).toEqual(['deploy-online-result.json']);
});
it('el modo check verifica sin publicar ni crear preparación de Functions', async () => {
 const context = runtime(); await deployOnline({ ...context, checkOnly: true });
 expect(context.calls.some(c => c.args.includes('deploy'))).toBe(false);
 expect(existsSync(join(root, '.firebase'))).toBe(false);
});
it.each(['projects:list', 'check', 'build:backend'])('un fallo en %s impide toda publicación', async fail => {
 const context = runtime({ fail }); await expect(deployOnline(context)).rejects.toThrow('simulated');
 expect(context.calls.some(c => c.args.includes('deploy'))).toBe(false);
});
it('si el backend falla no publica Hosting y registra el resultado incompleto', async () => {
 const context = runtime({ fail: 'deploy' }); await expect(deployOnline(context)).rejects.toThrow('simulated deploy');
 expect(context.calls.filter(c => c.args.includes('deploy'))).toHaveLength(1);
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8')).status).toBe('incomplete');
});
it('Spark detiene el proceso sin activar facturación', async () => {
 const context = runtime({ billing: false }); await expect(deployOnline(context)).rejects.toThrow('Blaze');
 expect(context.calls.some(c => c.args.includes('deploy') || c.args.includes('link') || c.args.includes('enable'))).toBe(false);
});
it('no sustituye el catálogo si falta la Sansevieria pública', async () => {
 const context = runtime({ missingPlant: true }); await expect(deployOnline(context)).rejects.toThrow('publicPlants/sansevieria');
 expect(context.calls.some(c => c.args.includes('deploy'))).toBe(false);
});
it('no informa éxito si la verificación HTTPS falla después de publicar', async () => {
 const context = runtime({ smokeFailure: true }); await expect(deployOnline(context)).rejects.toThrow('HTTPS');
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8'))).toMatchObject({ status: 'incomplete', steps: ['rules', 'ai-worker', 'backend', 'hosting'] });
});
it.each<Record<string, string>>([
 { VITE_FIREBASE_MODE: 'emulator' }, { VITE_FIREBASE_PROJECT_ID: 'other-project' },
 { VITE_FIREBASE_APP_ID: '' }, { VITE_FIREBASE_APPCHECK_SITE_KEY: '' }, { VITE_FIREBASE_APPCHECK_PROVIDER: 'unknown' },
 { VITE_FIREBASE_STORAGE_BUCKET: 'other-project.appspot.com' }, { VITE_OPENAI_API_KEY: 'private-fixture' },
])('rechaza configuración insegura antes de usar herramientas: %j', async invalid => {
 const context = runtime(); await expect(deployOnline({ ...context, raw: { ...raw, ...invalid } })).rejects.toThrow();
 expect(context.run).not.toHaveBeenCalled();
});
it('excluye IA y emuladores heredados sin perder la autenticación de despliegue', () => {
 const env = productionEnvironment(raw, { OPENAI_API_KEY: 'must-not-transfer', OPENAI_LOCAL_API_KEY: 'must-not-transfer', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:19099', FUNCTIONS_EMULATOR: 'true', AI_ENABLED: 'true', GOOGLE_APPLICATION_CREDENTIALS: '/authorized/credential.json' });
 expect(env.OPENAI_API_KEY).toBeUndefined(); expect(env.OPENAI_LOCAL_API_KEY).toBeUndefined(); expect(env.FIREBASE_AUTH_EMULATOR_HOST).toBeUndefined();
 expect(env.AI_ENABLED).toBe('false'); expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/authorized/credential.json');
});

it('exige modelos explícitos y mantiene la clave fuera de la configuración publicada', () => {
 expect(() => productionAIConfig({})).toThrow('OPENAI_TEXT_MODEL');
 expect(() => productionAIConfig({ OPENAI_TEXT_MODEL: 'sk-private-value', OPENAI_IMAGE_MODEL: 'gpt-image-2.6-sunburst' })).toThrow('IDs reales');
 expect(productionAIConfig({ OPENAI_TEXT_MODEL: 'gpt-6.1-terra', OPENAI_IMAGE_MODEL: 'gpt-image-2.6-sunburst', OPENAI_API_KEY: 'never-copy' })).not.toHaveProperty('OPENAI_API_KEY');
});
it.each([{ secretEnabled: false }, { foreignWorker: true }])('no publica ante secreto deshabilitado o una función que requeriría migración: %j', async options => {
 const context = runtime(options); await expect(deployOnline(context)).rejects.toThrow();
 expect(context.calls.some(command => command.args.includes('deploy'))).toBe(false);
});
it('un fallo al publicar processAI impide publicar Hosting', async () => {
 const context = runtime({ fail: 'functions:catalog:processAI' }); await expect(deployOnline(context)).rejects.toThrow('simulated');
 expect(context.calls.filter(command => command.args.includes('deploy'))).toHaveLength(2);
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8'))).toMatchObject({ status: 'incomplete', steps: ['rules'] });
});

it('un fallo al publicar adminCommand conserva el registro del worker y bloquea Hosting', async () => {
 const context = runtime({ fail: 'functions:catalog:adminCommand' }); await expect(deployOnline(context)).rejects.toThrow('simulated');
 expect(context.calls.filter(command => command.args.includes('deploy'))).toHaveLength(3);
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8'))).toMatchObject({ status: 'incomplete', steps: ['rules', 'ai-worker'] });
});

it('no publica si CORS impide descargar fotos desde los dominios del catálogo', async () => {
 const context = runtime({ missingCors: true });
 await expect(deployOnline(context)).rejects.toThrow('CORS');
 expect(context.calls.some(command => command.args.includes('deploy'))).toBe(false);
});

it('usa Enterprise en el preflight y transmite el mismo proveedor al build', async () => {
 const context = runtime();
 const fetcher = vi.fn<typeof fetch>(async (url, init) => String(url).includes('firebaseappcheck.googleapis.com')
  ? new Response(JSON.stringify({ name: `projects/123456/apps/${raw.VITE_FIREBASE_APP_ID}/recaptchaEnterpriseConfig`, siteKey: raw.VITE_FIREBASE_APPCHECK_SITE_KEY }))
  : context.fetcher(url, init));
 await deployOnline({ ...context, fetcher, raw: { ...raw, VITE_FIREBASE_APPCHECK_PROVIDER: 'recaptcha-enterprise' }, checkOnly: true });
 expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/recaptchaEnterpriseConfig?fields=name,siteKey'), expect.any(Object));
 expect(context.calls.find(command => command.args.includes('check'))?.env.VITE_FIREBASE_APPCHECK_PROVIDER).toBe('recaptcha-enterprise');
 expect(context.calls.some(command => command.args.includes('deploy'))).toBe(false);
});
