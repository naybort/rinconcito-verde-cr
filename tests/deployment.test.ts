// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deployOnline, type Command } from '../scripts/deploy-online';
import { productionEnvironment, productionOrigin } from '../scripts/production-config';

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
function runtime(options: { fail?: string; billing?: boolean; missingPlant?: boolean; smokeFailure?: boolean } = {}) {
 const calls: Command[] = [];
 const run = vi.fn((command: Command) => {
  calls.push(command);
  const args = command.args;
  if (options.fail && args.includes(options.fail)) throw new Error('simulated ' + options.fail);
  if (args.includes('projects:list')) return JSON.stringify({ status: 'success', result: [{ projectId: raw.VITE_FIREBASE_PROJECT_ID }] });
  if (args.includes('billing')) return JSON.stringify({ billingEnabled: options.billing !== false });
  if (args.includes('apps:sdkconfig')) return JSON.stringify({ status: 'success', result: { sdkConfig: { projectId: raw.VITE_FIREBASE_PROJECT_ID, appId: raw.VITE_FIREBASE_APP_ID, apiKey: raw.VITE_FIREBASE_API_KEY, authDomain: raw.VITE_FIREBASE_AUTH_DOMAIN, storageBucket: raw.VITE_FIREBASE_STORAGE_BUCKET } } });
  if (args.includes('firestore:databases:get')) return JSON.stringify({ status: 'success', result: { name: '(default)' } });
  if (args.includes('appcheck:apps:list')) return JSON.stringify({ status: 'success', result: [{ appId: raw.VITE_FIREBASE_APP_ID, providers: ['recaptcha-v3'] }] });
  if (args.includes('deploy')) {
   const config = JSON.parse(readFileSync(args[args.indexOf('--config') + 1], 'utf8'));
   expect(config.emulators).toBeUndefined(); expect(config.hosting.site).toBe(raw.VITE_FIREBASE_PROJECT_ID);
   const stage = join(args[args.indexOf('--config') + 1], '../functions');
   expect(existsSync(join(stage, '.env.local'))).toBe(false);
   expect(readFileSync(join(stage, '.env.' + raw.VITE_FIREBASE_PROJECT_ID), 'utf8')).toContain('AI_ENABLED=false');
   expect(readFileSync(join(root, 'functions/.env.local'), 'utf8')).toContain('AI_ENABLED=true');
  }
  return args.includes('rev-parse') ? 'fixture-commit' : '';
 });
 const fetcher = vi.fn(async (url: string | URL | Request) => {
  if (String(url).startsWith('https://firestore.googleapis.com')) return new Response('{}', { status: options.missingPlant ? 404 : 200 });
  if (options.smokeFailure) throw new Error('simulated HTTPS verification failure');
  return new Response(html);
 }) as unknown as typeof fetch;
 return { calls, run, fetcher, log: vi.fn(), root, raw, ambient: {} };
}
it('publica backend antes de Hosting, conserva el origen y verifica ambas URL exactas', async () => {
 const context = runtime(); await deployOnline(context);
 const deploys = context.calls.filter(c => c.args.includes('deploy'));
 expect(deploys.map(c => c.args[c.args.indexOf('--only') + 1])).toEqual(['firestore,storage,functions:catalog:adminCommand', 'hosting']);
 for (const command of deploys) {
  expect(command.args).toContain('--non-interactive'); expect(command.args).not.toContain('--force');
  expect(command.args[command.args.indexOf('--project') + 1]).toBe('rinconcito-verde-cr');
 }
 expect(context.fetcher).toHaveBeenCalledWith(productionOrigin + '/admin', expect.any(Object));
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8'))).toMatchObject({ status: 'deployed', steps: ['backend', 'hosting', 'https-version'] });
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
 expect(JSON.parse(readFileSync(join(root, '.firebase/deploy-online-result.json'), 'utf8'))).toMatchObject({ status: 'incomplete', steps: ['backend', 'hosting'] });
});
it.each<Record<string, string>>([
 { VITE_FIREBASE_MODE: 'emulator' }, { VITE_FIREBASE_PROJECT_ID: 'other-project' },
 { VITE_FIREBASE_APP_ID: '' }, { VITE_FIREBASE_APPCHECK_SITE_KEY: '' },
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
