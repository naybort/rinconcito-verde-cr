import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import App from '../src/app/App';
import { theme } from '../src/app/theme';
import { FAVORITES_KEY } from '../src/features/favorites/storage';
vi.mock('../src/features/catalog/data', async () => {
 const plants = await import('./fixtures/plants.json');
 const categories = await import('./fixtures/categories.json');
 return { catalog: { plants: plants.default.plants, categories: categories.default.categories } };
});
const mount = () => render(<ThemeProvider theme={theme}><App /></ThemeProvider>);
describe('SPEC-001 interfaz', () => {
 it('muestra tres plantas, guarda y quita favorito sin navegar', async () => {
  const user = userEvent.setup(); mount();
  expect(screen.getAllByRole('article')).toHaveLength(3);
  const favorite = screen.getByRole('button', { name: 'Guardar Monstera Deliciosa en favoritos' });
  await user.click(favorite);
  expect(screen.getByRole('button', { name: 'Quitar Monstera Deliciosa de favoritos' })).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual({ version: 1, plantIds: ['demo-monstera'] });
  await user.click(screen.getByRole('button', { name: 'Quitar Monstera Deliciosa de favoritos' }));
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!).plantIds).toEqual([]);
 });
 it('restaura favoritos y prepara enlace al número confirmado', () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, plantIds: ['demo-monstera','retirada'] }));
  window.location.hash = '#/favoritos'; mount();
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByLabelText('Vista previa del mensaje')).toHaveTextContent('Monstera Deliciosa');
  expect(screen.getByRole('link', { name: 'Continuar en WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa.me\/50671160290\?text=/);
 });
 it('explica la selección vacía', () => {
  window.location.hash = '#/favoritos'; mount();
  expect(screen.getByText('Tu rincón verde está por empezar')).toBeInTheDocument();
  expect(screen.queryByLabelText('Vista previa del mensaje')).not.toBeInTheDocument();
 });
 it('abre detalle por URL y ofrece agregarlo a favoritos', async () => {
  window.location.hash = '#/plantas/demo-monstera'; mount();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Monstera');
  await userEvent.click(screen.getByRole('button', { name: 'Añadir a favoritos' }));
  expect(screen.getByRole('button', { name: 'Quitar de favoritos' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Cómo cuidar tu planta' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Riego' })).toBeInTheDocument();
 });
 it('maneja planta retirada e imagen fallida', () => {
  const view = mount();
  fireEvent.error(screen.getByAltText('Monstera de hojas grandes en una maceta blanca'));
  expect(screen.getByText('Imagen no disponible')).toBeInTheDocument();
  view.unmount();
  window.location.hash = '#/plantas/inexistente'; mount();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No encontramos');
 });
 it('mantiene selección en memoria cuando escribir está bloqueado', async () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  mount();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar Monstera Deliciosa en favoritos' }));
  expect(screen.getByRole('button', { name: 'Quitar Monstera Deliciosa de favoritos' })).toHaveAttribute('aria-pressed','true');
  expect(screen.getByText(/se mantienen en esta sesión/)).toBeInTheDocument();
  spy.mockRestore();
 });
});

it('combina búsqueda y categoría, muestra vacío y limpia filtros', async () => {
 const user = userEvent.setup(); mount();
 await user.type(screen.getByRole('searchbox', { name: 'Buscar una planta' }), 'MONSTÉRA');
 expect(screen.getAllByRole('article')).toHaveLength(1);
 await user.click(screen.getByRole('button', { name: 'Suculentas' }));
 expect(screen.queryAllByRole('article')).toHaveLength(0);
 await user.click(screen.getByRole('button', { name: 'Ver todas las plantas' }));
 expect(screen.getAllByRole('article')).toHaveLength(3);
 expect(screen.getByRole('searchbox')).toHaveValue('');
});
it('enlaza crédito de Vision Mind sin publicar el sitio', () => {
 mount(); expect(screen.getByRole('link', { name: 'Vision Mind' })).toHaveAttribute('href', 'https://visionmind-ai.com/');
});
