import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft, type PlantRecord } from '../functions/src/domain';
import { PlantList } from '../src/features/admin/PlantList';
import { PlantIdentity } from '../src/features/admin/PlantIdentity';
import { Inventory } from '../src/features/admin/Inventory';
import { Taxonomies } from '../src/features/admin/Taxonomies';
import { Labels } from '../src/features/admin/Labels';
import { getBlob } from 'firebase/storage';
vi.mock('../src/lib/firebase', () => ({ firebase: { storage: {} } }));
vi.mock('firebase/storage', () => ({ getBlob: vi.fn(), ref: (_: unknown, path: string) => path }));
vi.mock('../src/shared/brand/identity', () => ({ brandIconData: async () => 'icon', loadImage: async () => ({}), downloadBlob: vi.fn() }));
vi.mock('../src/features/admin/labelTemplate', () => ({ labelLimits: { minWidth: 50, maxWidth: 100, minHeight: 45, maxHeight: 150, maxCopies: 100 }, createLabelSvg: async (p: { id: string }) => `<svg>${p.id}</svg>`, labelDataUrl: (s: string) => 'data:image/svg+xml,' + s }));
const records = (count = 26): PlantRecord[] => Array.from({ length: count }, (_, i) => ({ ...blankDraft(`planta-${i + 1}`), name: `Planta ${i + 1}`, image: { src: '/images/monstera.png', alt: 'Planta' }, status: 'published', publishedRevision: 1, revision: 1, updatedBy: 'fixture', updatedAt: new Date(2026, 0, i + 1).toISOString(), categoryIds: ['categoria-1'] }));
const pager = (name: string) => within(screen.getByRole('navigation', { name: `Paginación de ${name}` }));
const list = (name: string) => within(screen.getByRole('list', { name }));
beforeEach(() => { vi.clearAllMocks(); });

describe('colecciones administrativas', () => {
 it('pagina las filas, conserva contexto al editar y reinicia al buscar o cambiar tamaño', async () => {
  const user = userEvent.setup(), plants = records(), edit = vi.fn();
  plants[24].name = 'Órquídea';
  const view = render(<PlantList plants={plants} onEdit={edit}/>);
  expect(list('Fichas de plantas').getAllByRole('listitem')).toHaveLength(10);
  expect(screen.getAllByRole('img')).toHaveLength(10);
  await user.click(pager('plantas').getByRole('button', { name: 'Página siguiente' }));
  await user.click(screen.getByRole('button', { name: 'Editar Planta 10 · planta-10' }));
  expect(edit).toHaveBeenCalledWith(plants[9]);
  view.rerender(<PlantList plants={plants} onEdit={edit} visible={false}/>);
  view.rerender(<PlantList plants={plants} onEdit={edit}/>);
  expect(pager('plantas').getByRole('status')).toHaveTextContent('11–20 de 26');
  await user.type(screen.getByRole('searchbox'), 'orquidea');
  expect(list('Fichas de plantas').getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('ID: planta-25')).toBeInTheDocument();
  await user.clear(screen.getByRole('searchbox'));
  await user.selectOptions(pager('plantas').getByRole('combobox'), '25');
  expect(list('Fichas de plantas').getAllByRole('listitem')).toHaveLength(25);
  await user.click(pager('plantas').getByRole('button', { name: 'Página siguiente' }));
  view.rerender(<PlantList plants={plants.slice(0, 2)} onEdit={edit}/>);
  expect(pager('plantas').getByRole('status')).toHaveTextContent('1–2 de 2');
 });
 it('distingue nombres repetidos por ID y filtra estado sin perder el orden', async () => {
  const plants = records(3); plants[0].name = plants[1].name = 'Pastora'; plants[1].status = 'draft';
  render(<PlantList plants={plants} onEdit={vi.fn()}/>);
  expect(screen.getByRole('button', { name: 'Editar Pastora · planta-1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Editar Pastora · planta-2' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Borradores (1)' }));
  expect(list('Fichas de plantas').getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('ID: planta-2')).toBeInTheDocument();
 });
 it('conserva selección entre páginas y filtros y envía únicamente sus IDs al inventario', async () => {
  const user = userEvent.setup(), run = vi.fn().mockResolvedValue(true);
  render(<Inventory plants={records()} stocks={[]} movements={[]} run={run} busy={false}/>);
  await user.click(screen.getByRole('checkbox', { name: 'Planta 1' }));
  await user.click(pager('fichas de inventario').getByRole('button', { name: 'Página siguiente' }));
  await user.click(screen.getByRole('checkbox', { name: 'Planta 11' }));
  await user.type(screen.getByRole('searchbox', { name: 'Buscar ficha o ID' }), 'planta-26');
  expect(screen.getByRole('heading', { name: 'Movimiento para 2 fichas' })).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Motivo' }), 'Entrada de prueba');
  await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }));
  expect(run).toHaveBeenCalledWith('inventory', { items: ['planta-1', 'planta-11'].map(plantId => ({ plantId, presentation: 'general', type: 'entry', quantity: 1, reason: 'Entrada de prueba' })) });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Movimiento para 0 fichas' })).toBeInTheDocument());
 });
 it('limita lotes a 30 y permite encontrar movimientos anteriores al antiguo límite de 50', async () => {
  const movements = Array.from({ length: 61 }, (_, i) => ({ id: String(i), plantId: 'planta-1', presentation: 'general', type: 'entry', quantity: 1, reason: `Registro ${i}`, actor: 'fixture', at: new Date(2026, 0, i + 1).toISOString() }));
  render(<Inventory plants={records(35)} stocks={[]} movements={movements} run={vi.fn()} busy={false}/>);
  await userEvent.selectOptions(pager('fichas de inventario').getByRole('combobox'), '50');
  expect(screen.getByRole('button', { name: 'Seleccionar esta página' })).toBeDisabled();
  for (const box of screen.getAllByRole('checkbox').slice(0, 30)) fireEvent.click(box);
  expect(screen.getByRole('checkbox', { name: 'Planta 31' })).toBeDisabled();
  expect(list('Historial de movimientos').getAllByRole('listitem')).toHaveLength(10);
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar en el historial' }), 'Registro 0');
  expect(list('Historial de movimientos').getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText(/Registro 0 ·/)).toBeInTheDocument();
 });
 it('pagina categorías y fichas relacionadas y mantiene el formulario elegido', async () => {
  const categories = Array.from({ length: 23 }, (_, i) => ({ id: `categoria-${i + 1}`, name: `Categoría ${i + 1}`, active: true, revision: 1 }));
  render(<Taxonomies categories={categories} templates={[]} plants={records()} run={vi.fn()} busy={false}/>);
  expect(list('Categorías y cuidados').getAllByRole('listitem')).toHaveLength(10);
  await userEvent.click(screen.getByRole('button', { name: 'Editar Categoría 1 · categoria-1' }));
  expect(screen.getByLabelText('Nombre', { exact: true })).toHaveValue('Categoría 1');
  expect(pager('fichas relacionadas').getByRole('status')).toHaveTextContent('1–10 de 26');
  await userEvent.click(pager('categorías y cuidados').getByRole('button', { name: 'Página siguiente' }));
  expect(screen.getByLabelText('Nombre', { exact: true })).toHaveValue('Categoría 1');
 });
 it('conserva todas las copias imprimibles mientras pagina su vista previa', async () => {
  render(<Labels plants={records()}/>);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Planta 1' }));
  await userEvent.click(pager('fichas para etiquetas').getByRole('button', { name: 'Página siguiente' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Planta 11' }));
  fireEvent.change(screen.getByLabelText('Copias por ficha'), { target: { value: '12' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir / guardar PDF' })).toBeEnabled());
  expect(document.querySelectorAll('.plant-label')).toHaveLength(24);
  expect(screen.getAllByRole('img', { name: /Etiqueta QR/ })).toHaveLength(10);
  await userEvent.click(pager('vista previa de etiquetas').getByRole('button', { name: 'Ir a la página 3' }));
  expect(screen.getAllByRole('img', { name: /Etiqueta QR/ })).toHaveLength(4);
  expect(screen.getByRole('button', { name: 'Descargar etiqueta de Planta 11 · planta-11' })).toBeInTheDocument();
  expect(document.querySelectorAll('.plant-label')).toHaveLength(24);
 });
});

describe('miniaturas privadas', () => {
 it('descarta cargas antiguas y libera URLs al cambiar de foto o salir', async () => {
  const create = vi.fn(() => 'blob:foto'), revoke = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
  let resolveOld!: (blob: Blob) => void;
  vi.mocked(getBlob).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(new Blob(['new']));
  const plant = { ...records(1)[0], originalPath: 'originals/old' };
  const view = render(<PlantIdentity plant={plant}/>);
  view.rerender(<PlantIdentity plant={{ ...plant, originalPath: 'originals/new' }}/>);
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:foto'));
  resolveOld(new Blob(['old']));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  view.unmount(); expect(revoke).toHaveBeenCalledWith('blob:foto');
 });
 it('muestra un estado sin foto ante fallo y se recupera con otra fuente', async () => {
  const plant = records(1)[0], view = render(<PlantIdentity plant={plant}/>);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('Sin foto')).toBeInTheDocument();
  view.rerender(<PlantIdentity plant={{ ...plant, image: { src: '/images/calathea.png', alt: 'Nueva' } }}/>);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/calathea.png');
 });
});
