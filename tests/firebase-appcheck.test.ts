import { afterEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
 initializeApp: vi.fn(() => ({})), initializeAppCheck: vi.fn(), getAuth: vi.fn(() => ({})),
 v3: vi.fn(function (this: object, key: string) { Object.assign(this, { key, kind: 'v3' }); }),
 enterprise: vi.fn(function (this: object, key: string) { Object.assign(this, { key, kind: 'enterprise' }); }),
 connectAuth: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: sdk.initializeApp }));
vi.mock('firebase/app-check', () => ({ initializeAppCheck: sdk.initializeAppCheck, ReCaptchaV3Provider: sdk.v3, ReCaptchaEnterpriseProvider: sdk.enterprise }));
vi.mock('firebase/auth', () => ({ getAuth: sdk.getAuth, connectAuthEmulator: sdk.connectAuth }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})), connectFirestoreEmulator: vi.fn() }));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(() => ({})), connectFunctionsEmulator: vi.fn(), httpsCallable: vi.fn() }));
vi.mock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})), connectStorageEmulator: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.resetModules(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
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
