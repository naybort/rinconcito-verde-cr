import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { IdTokenResult, User } from 'firebase/auth';
import { ThemeProvider } from '@mui/material';
import App from '../src/app/App';
import { theme } from '../src/app/theme';
import { AdminShortcut } from '../src/features/admin/AdminShortcut';
import type { Catalog } from '../src/features/catalog/schema';

const auth = vi.hoisted(() => ({
 listener: undefined as undefined | ((user: User | null) => Promise<void>),
 fail: undefined as undefined | (() => void),
 stop: vi.fn(), subscribe: vi.fn(), getDoc: vi.fn(), doc: vi.fn(),
}));
vi.mock('../src/lib/firebase', () => ({ firebase: { auth: {}, db: {} } }));
vi.mock('firebase/auth', () => ({ onIdTokenChanged: (_: unknown, listener: typeof auth.listener, fail: typeof auth.fail) => {
 auth.subscribe(); auth.listener = listener; auth.fail = fail; return auth.stop;
} }));
vi.mock('firebase/firestore', () => ({ doc: auth.doc, getDoc: auth.getDoc }));
vi.mock('../src/features/catalog/usePublicCatalog', () => ({ usePublicCatalog: (catalog: Catalog) => ({ catalog, loading: false, error: '' }) }));
const member = (data: unknown = { active: true, role: 'admin' }) => ({ data: () => data });
const token = (role: unknown = 'admin'): IdTokenResult => ({ claims: { role }, authTime: '', expirationTime: '', issuedAtTime: '', signInProvider: 'password', signInSecondFactor: null, token: 'mock-token' });
const user = (role: unknown = 'admin', uid = 'local-admin') => ({ uid, getIdTokenResult: vi.fn().mockResolvedValue(token(role)) }) as unknown as User;
const mount = () => render(<ThemeProvider theme={theme}><App /></ThemeProvider>);
const restored = async (value: User | null) => {
 await waitFor(() => expect(auth.listener).toBeDefined());
 await act(async () => { await auth.listener!(value); });
};
beforeEach(() => {
 vi.clearAllMocks(); vi.stubEnv('VITE_FIREBASE_MODE', 'emulator');
 auth.listener = undefined; auth.fail = undefined;
 auth.getDoc.mockResolvedValue(member());
});
afterEach(() => { vi.stubEnv('VITE_FIREBASE_MODE', ''); });

it('mantiene el encabezado anónimo y oculta el acceso al cerrar sesión', async () => {
 mount();
 const header = within(screen.getByRole('banner'));
 expect(header.queryByRole('link', { name: 'Administrar' })).not.toBeInTheDocument();
 await restored(null);
 expect(header.getAllByRole('link')).toHaveLength(1);
 expect(auth.getDoc).not.toHaveBeenCalled();
 await restored(user());
 expect(header.getByRole('link', { name: 'Administrar' })).toHaveAttribute('href', '/admin');
 await restored(null);
 expect(header.queryByRole('link', { name: 'Administrar' })).not.toBeInTheDocument();
});
it.each(['admin', 'editor'])('restaura acceso %s al volver al catálogo, favoritos y detalle', async role => {
 auth.getDoc.mockResolvedValue(member({ active: true, role }));
 const view = mount(); await restored(user(role));
 for (const hash of ['#/favoritos', '#/plantas/sansevieria']) {
  act(() => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Administrar' })).toHaveAttribute('href', '/admin');
 }
 view.unmount(); expect(auth.stop).toHaveBeenCalledTimes(1);
 auth.listener = undefined; mount(); await restored(user(role));
 expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Administrar' })).toBeInTheDocument();
});
it('no ofrece acceso a cuentas sin permiso, inactivas o con un rol distinto', async () => {
 render(<AdminShortcut/>);
 await restored(user('customer'));
 expect(auth.getDoc).not.toHaveBeenCalled();
 for (const data of [undefined, { active: false, role: 'admin' }, { active: true, role: 'editor' }]) {
  auth.getDoc.mockResolvedValue({ data: () => data }); await restored(user());
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
 }
});
it('una respuesta tardía no recupera el botón después de cerrar sesión', async () => {
 let resolve!: (value: ReturnType<typeof member>) => void;
 auth.getDoc.mockReturnValue(new Promise(done => { resolve = done; }));
 render(<AdminShortcut/>);
 await waitFor(() => expect(auth.listener).toBeDefined());
 let pending!: Promise<void>;
 act(() => { pending = auth.listener!(user()); });
 await waitFor(() => expect(auth.getDoc).toHaveBeenCalledOnce());
 await restored(null);
 await act(async () => { resolve(member()); await pending; });
 expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('libera la suscripción y descarta verificaciones tras desmontar el encabezado', async () => {
 let resolve!: (value: IdTokenResult) => void;
 const account = user();
 vi.mocked(account.getIdTokenResult).mockReturnValue(new Promise(done => { resolve = done; }));
 const view = render(<AdminShortcut/>);
 await waitFor(() => expect(auth.listener).toBeDefined());
 let pending!: Promise<void>;
 act(() => { pending = auth.listener!(account); });
 view.unmount(); expect(auth.stop).toHaveBeenCalledOnce();
 await act(async () => { resolve(token()); await pending; });
 expect(auth.getDoc).not.toHaveBeenCalled();
});
it('oculta el botón ante error de permisos o de sesión sin afectar el catálogo', async () => {
 mount(); await restored(user());
 act(() => { auth.fail!(); });
 expect(screen.queryByRole('link', { name: 'Administrar' })).not.toBeInTheDocument();
 auth.getDoc.mockRejectedValue(new Error('permission-denied'));
 await restored(user());
 expect(screen.queryByRole('link', { name: 'Administrar' })).not.toBeInTheDocument();
 expect(screen.getByRole('searchbox', { name: 'Buscar una planta' })).toBeInTheDocument();
});
it('no consulta autenticación en el catálogo estático sin Firebase', () => {
 vi.stubEnv('VITE_FIREBASE_MODE', ''); mount();
 expect(auth.subscribe).not.toHaveBeenCalled();
 expect(screen.queryByRole('link', { name: 'Administrar' })).not.toBeInTheDocument();
});
