// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkAppCheck, saveEnterpriseAppCheck } from '../scripts/check-appcheck';
const appId = '1:123456:web:abc123';
const name = `projects/123456/apps/${appId}/recaptchaV3Config`;
const token = 'fixture-access-token-must-stay-private';
function runtime(status = 200, data: unknown = { name, siteSecretSet: true }) {
 const fetcher = vi.fn(async () => new Response(JSON.stringify(data), { status }));
 return { appId, projectNumber: '123456', getAccessToken: vi.fn(() => token), fetcher };
}
it('consulta solo metadatos de la app exacta con la sesión gcloud y sin redirecciones', async () => {
 const context = runtime();
 expect(await checkAppCheck(context)).toEqual({ appId, provider: 'recaptcha-v3', configured: true });
 expect(context.fetcher).toHaveBeenCalledWith('https://firebaseappcheck.googleapis.com/v1/projects/123456/apps/1%3A123456%3Aweb%3Aabc123/recaptchaV3Config?fields=name,siteSecretSet', expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer ' + token, 'X-Goog-User-Project': 'rinconcito-verde-cr' }, redirect: 'error', cache: 'no-store' }));
});
it.each([404, 403, 429, 500])('un HTTP %s bloquea la comprobación sin revelar el token ni la respuesta cruda', async status => {
 const context = runtime(status, { error: { message: token } });
 await expect(checkAppCheck(context)).rejects.not.toThrow(token);
 expect(context.getAccessToken).toHaveBeenCalledOnce();
});
it.each([{ name, siteSecretSet: false }, { name: 'another-app', siteSecretSet: true }, {}])('rechaza un registro incompleto o de otra app: %j', async data => {
 await expect(checkAppCheck(runtime(200, data))).rejects.toThrow('registro');
});
it('rechaza otro proyecto antes de solicitar credenciales o consultar la API', async () => {
 const context = runtime();
 await expect(checkAppCheck({ ...context, projectNumber: '999999' })).rejects.toThrow('proyecto');
 expect(context.getAccessToken).not.toHaveBeenCalled(); expect(context.fetcher).not.toHaveBeenCalled();
});
it('oculta detalles de errores de red que podrían contener credenciales', async () => {
 const context = runtime(); context.fetcher.mockRejectedValue(new Error('request failed: ' + token));
 await expect(checkAppCheck(context)).rejects.toThrow('conexión');
 await expect(checkAppCheck(context)).rejects.not.toThrow(token);
});
it('rechaza una sesión vacía sin enviar la petición', async () => {
 const context = runtime(); context.getAccessToken.mockReturnValue('');
 await expect(checkAppCheck(context)).rejects.toThrow('sesión'); expect(context.fetcher).not.toHaveBeenCalled();
});

it('distingue un motivo conocido de HTTP 403 sin mostrar el cuerpo crudo', async () => {
 const context = runtime(403, { error: { message: token, details: [{ reason: 'SERVICE_DISABLED' }] } });
 await expect(checkAppCheck(context)).rejects.toThrow('SERVICE_DISABLED');
});

const enterpriseName = `projects/123456/apps/${appId}/recaptchaEnterpriseConfig`;
const siteKey = 'fixture-enterprise-public-key';
it('valida Enterprise y su clave pública usando únicamente el recurso correcto', async () => {
 const context = runtime(200, { name: enterpriseName, siteKey });
 expect(await checkAppCheck({ ...context, provider: 'recaptcha-enterprise', expectedSiteKey: siteKey })).toMatchObject({ appId, provider: 'recaptcha-enterprise', configured: true, siteKey });
 expect(context.fetcher).toHaveBeenCalledWith(expect.stringContaining('/recaptchaEnterpriseConfig?fields=name,siteKey'), expect.objectContaining({ redirect: 'error' }));
 expect(context.fetcher).toHaveBeenCalledOnce();
});
it.each([{ name: enterpriseName }, { name, siteKey }, { name: enterpriseName, siteKey: 'invalid\nkey' }])('rechaza Enterprise incompleto o ajeno: %j', async data => {
 await expect(checkAppCheck({ ...runtime(200, data), provider: 'recaptcha-enterprise' })).rejects.toThrow('registro');
});
it('bloquea una clave pública distinta antes de publicar', async () => {
 await expect(checkAppCheck({ ...runtime(200, { name: enterpriseName, siteKey }), provider: 'recaptcha-enterprise', expectedSiteKey: 'different-site-key' })).rejects.toThrow('no coincide');
});
it('rechaza un proveedor desconocido sin consultar credenciales', async () => {
 const context = runtime();
 await expect(checkAppCheck({ ...context, provider: 'disabled' })).rejects.toThrow('PROVIDER');
 expect(context.getAccessToken).not.toHaveBeenCalled();
});
const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); vi.unstubAllEnvs(); });
function configDirectory() {
 const root = mkdtempSync(join(tmpdir(), 'rv-enterprise-config-')); directories.push(root);
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud');
 return root;
}
it('sincroniza solo proveedor/clave pública, respalda y conserva modelos, app y emuladores', () => {
 const root = configDirectory(), target = join(root, '.env.production.local');
 const previous = `# Public configuration\nVITE_FIREBASE_MODE=cloud\nVITE_FIREBASE_PROJECT_ID=rinconcito-verde-cr\nVITE_FIREBASE_APP_ID=${appId}\nVITE_FIREBASE_APPCHECK_SITE_KEY=old-site-key\nexport VITE_FIREBASE_APPCHECK_PROVIDER=recaptcha-v3\nOPENAI_TEXT_MODEL=existing-model\n`;
 writeFileSync(target, previous); writeFileSync(join(root, '.env.local'), 'VITE_FIREBASE_MODE=emulator\n');
 const result = { appId, provider: 'recaptcha-enterprise' as const, siteKey };
 saveEnterpriseAppCheck(root, result); saveEnterpriseAppCheck(root, result);
 const saved = readFileSync(target, 'utf8');
 expect(saved).toContain('VITE_FIREBASE_APPCHECK_PROVIDER=recaptcha-enterprise');
 expect(saved).toContain('VITE_FIREBASE_APPCHECK_SITE_KEY=' + siteKey);
 expect(saved).toContain('OPENAI_TEXT_MODEL=existing-model'); expect(saved).not.toContain('old-site-key');
 expect(saved.match(/VITE_FIREBASE_APPCHECK_PROVIDER=/g)).toHaveLength(1);
 expect(readFileSync(join(root, '.env.local'), 'utf8')).toBe('VITE_FIREBASE_MODE=emulator\n');
 const backups = readdirSync(root).filter(file => file.includes('.backup-'));
 expect(backups).toHaveLength(1); expect(readFileSync(join(root, backups[0]), 'utf8')).toBe(previous);
 expect(statSync(target).mode & 0o777).toBe(0o600); expect(statSync(join(root, backups[0])).mode & 0o777).toBe(0o600);
});
it('no cambia archivos si la app local difiere de la verificada', () => {
 const root = configDirectory(), target = join(root, '.env.production.local');
 const previous = 'VITE_FIREBASE_PROJECT_ID=rinconcito-verde-cr\nVITE_FIREBASE_APP_ID=1:123456:web:def456\n';
 writeFileSync(target, previous);
 expect(() => saveEnterpriseAppCheck(root, { appId, provider: 'recaptcha-enterprise', siteKey })).toThrow('no corresponde');
 expect(readFileSync(target, 'utf8')).toBe(previous); expect(readdirSync(root)).toHaveLength(1);
});
