// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { checkAppCheck } from '../scripts/check-appcheck';
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
