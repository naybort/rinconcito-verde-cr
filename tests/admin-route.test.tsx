import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ThemeProvider } from '@mui/material';
import App from '../src/app/App';
import { theme } from '../src/app/theme';

const mount = () => render(<ThemeProvider theme={theme}><App /></ThemeProvider>);
it.each(['/admin', '/admin/', '/#/admin', '/#admin'])('abre el panel desde %s y conserva el acceso privado', async (url) => {
 window.history.replaceState({ previous: 'catalog' }, '', url);
 const length = window.history.length;
 mount();
 expect(await screen.findByRole('heading', { name: 'Administración privada' })).toBeInTheDocument();
 expect(window.location.pathname).toBe('/admin');
 expect(window.location.hash).toBe('');
 expect(window.history.length).toBe(length);
 expect(window.history.state).toEqual({ previous: 'catalog' });
 // Tests never connect to Firebase; entering a route does not enable access.
 expect(screen.getByText(/Administración pendiente de configuración/)).toBeInTheDocument();
 expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/');
});
it('conserva la consulta al convertir un marcador antiguo', async () => {
 window.history.replaceState(null, '', '/?origen=marcador#/admin');
 mount();
 await screen.findByRole('heading', { name: 'Administración privada' });
 expect(window.location.pathname + window.location.search + window.location.hash).toBe('/admin?origen=marcador');
});
it('responde a atrás y adelante entre catálogo y administración', async () => {
 window.history.replaceState(null, '', '/#/favoritos');
 mount();
 expect(screen.getByRole('heading', { name: 'Tus favoritos' })).toBeInTheDocument();
 act(() => {
  window.history.pushState(null, '', '/admin');
  window.dispatchEvent(new PopStateEvent('popstate'));
 });
 await screen.findByRole('heading', { name: 'Administración privada' });
 act(() => { window.history.back(); });
 await waitFor(() => expect(screen.getByRole('heading', { name: 'Tus favoritos' })).toBeInTheDocument());
 act(() => { window.history.forward(); });
 await screen.findByRole('heading', { name: 'Administración privada' });
 expect(window.location.pathname).toBe('/admin');
});
it('no abre el administrador por coincidencias parciales', () => {
 window.history.replaceState(null, '', '/#/admin-otra');
 mount();
 expect(screen.getByRole('heading', { name: 'No encontramos esa página' })).toBeInTheDocument();
});
