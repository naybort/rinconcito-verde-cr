import { StrictMode, useEffect } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PageLoading, PageLoadingBoundary } from '../src/shared/loading/PageLoading';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const content = <h1>Catálogo listo</h1>;

it('carga los hijos en paralelo pero los muestra solo al cumplir 3 segundos', () => {
 const fetchCatalog = vi.fn();
 function Catalog() { useEffect(fetchCatalog, []); return content; }
 render(<PageLoadingBoundary><Catalog/></PageLoadingBoundary>);
 expect(fetchCatalog).toHaveBeenCalledOnce();
 expect(screen.getByRole('status')).toHaveTextContent('Preparando tu rincón verde');
 expect(screen.queryByRole('heading')).not.toBeInTheDocument();
 advance(2999); expect(screen.queryByRole('heading')).not.toBeInTheDocument();
 advance(1); expect(screen.getByRole('heading')).toHaveTextContent('Catálogo listo');
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('espera una carga lenta y no añade otros 3 segundos al terminar', () => {
 const view = render(<PageLoadingBoundary><PageLoading message="Cargando catálogo…"/></PageLoadingBoundary>);
 advance(8000); expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogo');
 view.rerender(<PageLoadingBoundary>{content}</PageLoadingBoundary>);
 advance(0); expect(screen.getByRole('heading')).toHaveTextContent('Catálogo listo');
});
it('la descarga del módulo y la comprobación de acceso comparten el mismo mínimo', () => {
 const view = render(<PageLoadingBoundary><PageLoading key="module" message="Cargando administración…"/></PageLoadingBoundary>);
 advance(3500);
 view.rerender(<PageLoadingBoundary><PageLoading key="auth" message="Verificando acceso…"/></PageLoadingBoundary>);
 advance(500); expect(screen.getByRole('status')).toHaveTextContent('Verificando acceso');
 view.rerender(<PageLoadingBoundary>{content}</PageLoadingBoundary>);
 advance(0); expect(screen.getByRole('heading')).toBeInTheDocument();
});
it('mantiene 3 segundos para una nueva carga y libera sus temporizadores al desmontar', () => {
 const view = render(<PageLoadingBoundary>{content}</PageLoadingBoundary>);
 advance(3000);
 view.rerender(<PageLoadingBoundary><PageLoading message="Verificando acceso…"/></PageLoadingBoundary>);
 advance(500); view.rerender(<PageLoadingBoundary>{content}</PageLoadingBoundary>);
 advance(2499); expect(screen.queryByRole('heading')).not.toBeInTheDocument();
 advance(1); expect(screen.getByRole('heading')).toBeInTheDocument();
 view.unmount(); expect(vi.getTimerCount()).toBe(0);
});
it('finaliza en StrictMode y deja visible el error de carga con su alternativa', () => {
 const view = render(<StrictMode><PageLoadingBoundary><PageLoading/></PageLoadingBoundary></StrictMode>);
 advance(1000);
 view.rerender(<StrictMode><PageLoadingBoundary><p role="alert">Mostramos la última versión disponible.</p>{content}</PageLoadingBoundary></StrictMode>);
 advance(2000);
 expect(screen.getByRole('alert')).toHaveTextContent('última versión');
 expect(screen.getByRole('heading')).toBeInTheDocument();
});
