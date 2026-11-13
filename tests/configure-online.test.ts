// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configureOnline, mergeProductionConfig } from '../scripts/configure-online';
const config = { projectId: 'rinconcito-verde-cr', appId: '1:123456:web:abc123', apiKey: 'fixture-public-key', authDomain: 'rinconcito-verde-cr.firebaseapp.com', storageBucket: 'rinconcito-verde-cr.firebasestorage.app' };
let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'rv-config-test-')); });
afterEach(() => rmSync(root, { recursive: true, force: true }));
it('registra solo una app, obtiene valores públicos y preserva la configuración de emuladores', () => {
 let registered = false;
 const run = vi.fn((args: string[]) => {
  expect(args[args.indexOf('--project') + 1]).toBe(config.projectId);
  const result = args.includes('apps:list') ? (registered ? [{ appId: config.appId }] : []) : args.includes('apps:create') ? (registered = true, { appId: config.appId }) : { sdkConfig: config };
  return JSON.stringify({ status: 'success', result });
 });
 writeFileSync(join(root, '.env.local'), 'VITE_FIREBASE_MODE=emulator\n');
 configureOnline(root, run); configureOnline(root, run);
 expect(run.mock.calls.filter(([args]) => args.includes('apps:create'))).toHaveLength(1);
 expect(readFileSync(join(root, '.env.local'), 'utf8')).toBe('VITE_FIREBASE_MODE=emulator\n');
 expect(readFileSync(join(root, '.env.production.local'), 'utf8')).toContain('VITE_FIREBASE_APP_ID="1:123456:web:abc123"');
 expect(readdirSync(root).filter(name => name.includes('.backup-'))).toHaveLength(1);
});
it('conserva App Check y modelos existentes, sustituyendo solamente los valores Firebase', () => {
 const result = mergeProductionConfig('VITE_FIREBASE_MODE=emulator\nVITE_FIREBASE_API_KEY=old\nVITE_FIREBASE_APPCHECK_SITE_KEY=site-value\nOPENAI_TEXT_MODEL=existing-model\n', config);
 expect(result).toContain('VITE_FIREBASE_MODE="cloud"'); expect(result).not.toContain('API_KEY=old');
 expect(result).toContain('VITE_FIREBASE_APPCHECK_SITE_KEY=site-value'); expect(result).toContain('OPENAI_TEXT_MODEL=existing-model');
 expect(result).toContain('OPENAI_IMAGE_MODEL=\n');
});
it('no elige una app arbitraria si hay varias ni escribe ante un error de Firebase', () => {
 expect(() => configureOnline(root, () => JSON.stringify({ status: 'success', result: [{ appId: 'one' }, { appId: 'two' }] }))).toThrow('varias apps');
 expect(() => configureOnline(root, () => { throw new Error('no access'); })).toThrow('no access');
 expect(existsSync(join(root, '.env.production.local'))).toBe(false);
});
it('rechaza una configuración ajena o incompleta antes de escribir', () => {
 expect(() => mergeProductionConfig('', { ...config, projectId: 'another-project' })).toThrow();
 expect(() => mergeProductionConfig('', { ...config, appId: '' })).toThrow();
 expect(() => mergeProductionConfig('', { ...config, storageBucket: 'another-project.appspot.com' })).toThrow();
});
