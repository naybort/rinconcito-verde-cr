import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
 initializeApp: vi.fn(() => ({})), initializeAppCheck: vi.fn(() => ({ fixture: 'app-check' })), getToken: vi.fn(async () => ({ token: 'fixture-attestation' })), call: vi.fn(async () => ({ data: { saved: true } })), getAuth: vi.fn(() => ({})),
 v3: vi.fn(function (this: object, key: string) { Object.assign(this, { key, kind: 'v3' }); }),
 enterprise: vi.fn(function (this: object, key: string) { Object.assign(this, { key, kind: 'enterprise' }); }),
 connectAuth: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: sdk.initializeApp }));
vi.mock('firebase/app-check', () => ({ initializeAppCheck: sdk.initializeAppCheck, getToken: sdk.getToken, ReCaptchaV3Provider: sdk.v3, ReCaptchaEnterpriseProvider: sdk.enterprise }));
vi.mock('firebase/auth', () => ({ getAuth: sdk.getAuth, connectAuthEmulator: sdk.connectAuth }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})), connectFirestoreEmulator: vi.fn() }));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(() => ({})), connectFunctionsEmulator: vi.fn(), httpsCallable: vi.fn(() => sdk.call) }));
vi.mock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})), connectStorageEmulator: vi.fn() }));
beforeEach(() => vi.stubEnv('VITE_FIREBASE_APPCHECK_ENABLED', 'true'));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); vi.resetModules(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each([['recaptcha-enterprise', 'enterprise'], ['recaptcha-v3', 'v3'], ['', 'v3']])('inicia %s antes de usar Auth, con renovación automática', async (provider, kind) => {
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_PROVIDER', provider); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key');
 await import('../src/lib/firebase');
 expect(sdk.initializeAppCheck).toHaveBeenCalledWith(expect.anything(), { provider: expect.objectContaining({ kind, key: 'fixture-site-key' }), isTokenAutoRefreshEnabled: true });
 expect(sdk.initializeAppCheck.mock.invocationCallOrder[0]).toBeLessThan(sdk.getAuth.mock.invocationCallOrder[0]);
 expect(sdk.connectAuth).not.toHaveBeenCalled();
});
it('los emuladores no solicitan App Check aunque haya una clave heredada', async () => {
 vi.stubGlobal('location', { hostname: 'localhost' });
 vi.stubEnv('VITE_FIREBASE_MODE', 'emulator'); vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-rinconcito-verde'); vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'demo-rinconcito-verde.appspot.com'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key');
 await import('../src/lib/firebase');
 expect(sdk.initializeAppCheck).not.toHaveBeenCalled(); expect(sdk.connectAuth).toHaveBeenCalledOnce();
});
it('rechaza un proveedor desconocido en vez de iniciar uno distinto', async () => {
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_PROVIDER', 'disabled'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key');
 await expect(import('../src/lib/firebase')).rejects.toThrow('PROVIDER');
 expect(sdk.initializeAppCheck).not.toHaveBeenCalled();
});

it('espera App Check antes del guardado y conserva respuesta e ID de solicitud', async () => {
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key');
 const { command } = await import('../src/lib/firebase');
 expect(await command('savePlant', { id: 'plant' }, 'stable-request')).toEqual({ saved: true });
 expect(sdk.getToken).toHaveBeenCalledWith({ fixture: 'app-check' });
 expect(sdk.getToken.mock.invocationCallOrder[0]).toBeLessThan(sdk.call.mock.invocationCallOrder[0]);
 expect(sdk.call).toHaveBeenCalledWith({ action: 'savePlant', payload: { id: 'plant' }, requestId: 'stable-request' });
});
it('no envía una operación si App Check falla y oculta mensajes privados del proveedor', async () => {
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key');
 const { command } = await import('../src/lib/firebase');
 sdk.getToken.mockRejectedValueOnce({ code: 'appCheck/fetch-status-error', message: 'private-token-value', customData: { httpStatus: 403, token: 'private-token-value' } });
 const error = await command('savePlant', {}, 'stable-request').catch(error => error as Error);
 expect(error.message).toContain('appCheck/fetch-status-error; HTTP 403'); expect(error.message).not.toContain('private-token-value');
 expect(sdk.call).not.toHaveBeenCalled();
});
it('la pausa explícita no inicia reCAPTCHA y conserva el uso de la callable autenticada', async () => {
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key'); vi.stubEnv('VITE_FIREBASE_APPCHECK_ENABLED', 'false');
 const { command } = await import('../src/lib/firebase');
 expect(await command('savePlant', {}, 'stable-request')).toEqual({ saved: true });
 expect(sdk.initializeAppCheck).not.toHaveBeenCalled(); expect(sdk.getToken).not.toHaveBeenCalled(); expect(sdk.getAuth).toHaveBeenCalledOnce();
});
it('App Check activo sin clave impide guardar en vez de enviar una solicitud incompleta', async () => {
 vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', '');
 const { command } = await import('../src/lib/firebase');
 await expect(command('savePlant', {}, 'stable-request')).rejects.toThrow('Falta configurar App Check'); expect(sdk.call).not.toHaveBeenCalled();
});
it('un intercambio bloqueado termina sin enviar el guardado ni reintentarlo al resolverse tarde', async () => {
 vi.useFakeTimers(); vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'fixture-site-key');
 const { command } = await import('../src/lib/firebase');
 let complete!: (value: { token: string }) => void;
 sdk.getToken.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
 const result = command('savePlant', {}, 'stable-request').catch(error => error as Error);
 await vi.advanceTimersByTimeAsync(20000);
 expect((await result).message).toContain('appCheck/timeout');
 complete({ token: 'late-token' }); await vi.runAllTimersAsync(); expect(sdk.call).not.toHaveBeenCalled();
});
