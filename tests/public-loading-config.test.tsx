import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultLoadingSettings, fallbackPublicLoadingSettings } from '../functions/src/loadingSettings';
import { loadPublicLoadingSettings, publicLoadingEndpoint, selectLoadingTip } from '../src/shared/loading/publicLoadingConfig';
import { PageLoading, PageLoadingBoundary } from '../src/shared/loading/PageLoading';
import { LoadingAppBoundary } from '../src/shared/loading/LoadingAppBoundary';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('solo consulta el endpoint público confirmado o emuladores demo locales', () => {
 expect(publicLoadingEndpoint({ VITE_FIREBASE_MODE: 'cloud', VITE_FIREBASE_PROJECT_ID: 'rinconcito-verde-cr' })).toBe('https://us-central1-rinconcito-verde-cr.cloudfunctions.net/getPublicLoadingSettings');
 expect(publicLoadingEndpoint({ VITE_FIREBASE_MODE: 'cloud', VITE_FIREBASE_PROJECT_ID: 'other-project' })).toBeNull();
 expect(publicLoadingEndpoint({ VITE_FIREBASE_MODE: 'emulator', VITE_FIREBASE_PROJECT_ID: 'demo-rinconcito-verde' }, 'localhost')).toContain('/demo-rinconcito-verde/us-central1/');
 expect(publicLoadingEndpoint({ VITE_FIREBASE_MODE: 'emulator', VITE_FIREBASE_PROJECT_ID: 'demo-rinconcito-verde' }, 'example.test')).toBeNull();
 expect(publicLoadingEndpoint({})).toBeNull();
});
it('lee configuración con GET sin credenciales y rechaza respuestas desconocidas', async () => {
 const data = { title: 'Bienvenidos', subtitle: 'El vivero está creciendo.', animation: 'leaves', tips: ['Un consejo revisado.'] };
 const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(data))).mockResolvedValueOnce(new Response(JSON.stringify({ ...data, animation: '<script>' })));
 expect(await loadPublicLoadingSettings('https://fixture.test/loading', fetcher)).toEqual(data);
 expect(fetcher).toHaveBeenCalledWith('https://fixture.test/loading', expect.objectContaining({ method: 'GET', credentials: 'omit', redirect: 'error' }));
 expect(await loadPublicLoadingSettings('https://fixture.test/loading', fetcher)).toEqual(fallbackPublicLoadingSettings());
});
it('el timeout vuelve a fallback sin bloquear el catálogo ni reintentar', async () => {
 vi.useFakeTimers();
 const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
 const result = loadPublicLoadingSettings('https://fixture.test/loading', fetcher);
 await vi.advanceTimersByTimeAsync(1500);
 expect(await result).toEqual(fallbackPublicLoadingSettings()); expect(fetcher).toHaveBeenCalledOnce();
 expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
});
it('selecciona un único consejo de la lista o del fallback vacío', () => {
 const data = fallbackPublicLoadingSettings();
 expect(selectLoadingTip({ ...data, tips: ['A', 'B'] }, () => .9)).toBe('B');
 expect(selectLoadingTip({ ...data, tips: [] }, () => 0)).toBe(defaultLoadingSettings().tips[0].text);
});
it('mantiene la configuración y el consejo del episodio sin cambiar el loader privado', async () => {
 vi.useFakeTimers(); vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'rinconcito-verde-cr');
 const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ title: 'Mi bienvenida', subtitle: 'Texto personalizado', animation: 'none', tips: ['Consejo A', 'Consejo B'] })));
 vi.stubGlobal('fetch', fetcher); const random = vi.spyOn(Math, 'random').mockReturnValue(0);
 const view = render(<PageLoadingBoundary audience="public"><PageLoading message="Catálogo…"/></PageLoadingBoundary>);
 await act(async () => { await vi.advanceTimersByTimeAsync(0); });
 expect(screen.getByText('Mi bienvenida')).toBeInTheDocument(); expect(screen.getByText('Consejo A')).toBeInTheDocument();
 random.mockReturnValue(.99);
 view.rerender(<PageLoadingBoundary audience="public"><PageLoading message="Otra fase…"/></PageLoadingBoundary>);
 expect(screen.getByText('Consejo A')).toBeInTheDocument(); expect(screen.queryByText('Consejo B')).not.toBeInTheDocument();
 view.unmount(); fetcher.mockClear();
 render(<PageLoadingBoundary audience="private"><PageLoading message="Verificando acceso…"/></PageLoadingBoundary>);
 await act(async () => { await vi.advanceTimersByTimeAsync(0); });
 expect(screen.getByText('Un poquito de agua…')).toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('Verificando acceso');
 expect(screen.queryByText('Mi bienvenida')).not.toBeInTheDocument(); expect(fetcher).not.toHaveBeenCalled();
});

it('al navegar al admin elimina la configuración pública y no vuelve a consultar', async () => {
 vi.useFakeTimers(); vi.stubEnv('VITE_FIREBASE_MODE', 'cloud'); vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'rinconcito-verde-cr');
 const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ title: 'Bienvenida pública', subtitle: 'Solo catálogo', animation: 'leaves', tips: ['Consejo público'] })));
 vi.stubGlobal('fetch', fetcher);
 window.history.replaceState(null, '', '/');
 render(<LoadingAppBoundary><PageLoading message="Preparando pantalla…"/></LoadingAppBoundary>);
 await act(async () => { await vi.advanceTimersByTimeAsync(0); });
 expect(screen.getByText('Bienvenida pública')).toBeInTheDocument();
 act(() => { window.history.pushState(null, '', '/admin'); window.dispatchEvent(new PopStateEvent('popstate')); });
 await act(async () => { await vi.advanceTimersByTimeAsync(0); });
 expect(screen.getByText('Un poquito de agua…')).toBeInTheDocument();
 expect(screen.queryByText('Bienvenida pública')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Consejo del vivero')).not.toBeInTheDocument();
 expect(fetcher).toHaveBeenCalledOnce();
});
