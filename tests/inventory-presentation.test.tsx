import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { blankDraft, type PlantRecord, type Stock } from '../functions/src/domain';
import { Inventory } from '../src/features/admin/Inventory';
import { emptyInventory, inventoryDraftSchema, type InventoryDraft } from '../src/features/admin/workflow';
import { PlantPrices } from '../src/features/catalog/PlantPrices';
vi.mock('../src/lib/firebase', () => ({ firebase: null }));
const plant: PlantRecord = { ...blankDraft('planta-1'), name: 'Sansevieria', image: { src: '/images/sansevieria.png', alt: 'Sansevieria' }, revision: 1, status: 'published', updatedAt: '2026-11-16T00:00:00Z', updatedBy: 'fixture' };
const stocks: Stock[] = [
 { plantId: plant.id, presentation: 'general', available: 10, reserved: 2, priceCRC: 2500, location: 'Mesa norte', potNumber: '12' },
 { plantId: plant.id, presentation: 'grande', available: 4, reserved: 1, priceCRC: 7500, location: 'Mesa sur', potNumber: '20 cm' },
];
const save = () => screen.getByRole('button', { name: 'Guardar presentación de la ficha seleccionada' });
const mount = (run = vi.fn().mockResolvedValue({})) => ({ run, ...render(<Inventory plants={[plant]} stocks={stocks} movements={[]} scopedPlantId={plant.id} run={run} busy={false}/>) });

describe('metadatos de una presentación', () => {
 it('carga metadatos existentes y guarda solamente el número de maceta editado', async () => {
  const { run } = mount();
  expect(screen.getByLabelText('Número de maceta')).toHaveValue('12');
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(2500);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa norte');
  expect(save()).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Número de maceta'), { target: { value: '14' } });
  await userEvent.click(save());
  expect(run).toHaveBeenCalledWith('presentation', { plantId: plant.id, presentation: 'general', potNumber: '14' });
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(2500);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa norte');
  expect(screen.getByLabelText('Número de maceta')).toHaveValue('14');
  await waitFor(() => expect(save()).toBeDisabled());
  expect(screen.getByText('10 disponibles')).toBeInTheDocument();
  expect(screen.getByText(/2 reservadas/)).toBeInTheDocument();
 });
 it('distingue varias presentaciones y borrar el precio requiere editarlo explícitamente', async () => {
  const { run } = mount();
  await userEvent.click(screen.getByRole('combobox', { name: 'Usar presentación existente' }));
  await userEvent.click(screen.getByRole('option', { name: 'grande · Maceta n.º 20 cm' }));
  expect(screen.getByLabelText('Número de maceta')).toHaveValue('20 cm');
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(7500);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa sur');
  await userEvent.clear(screen.getByLabelText('Precio CRC (opcional, entero)'));
  await userEvent.click(save());
  expect(run).toHaveBeenCalledWith('presentation', { plantId: plant.id, presentation: 'grande', priceCRC: null });
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(null);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa sur');
 });
 it('protege cambios pendientes al cambiar de presentación', async () => {
  const { run } = mount();
  fireEvent.change(screen.getByLabelText('Número de maceta'), { target: { value: '18' } });
  fireEvent.change(screen.getByLabelText('Presentación (ID)'), { target: { value: 'grande' } });
  expect(screen.getByRole('dialog', { name: 'Cambios de presentación sin guardar' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
  expect(screen.getByLabelText('Presentación (ID)')).toHaveValue('general');
  expect(screen.getByLabelText('Número de maceta')).toHaveValue('18');
  fireEvent.change(screen.getByLabelText('Presentación (ID)'), { target: { value: 'grande' } });
  await userEvent.click(screen.getByRole('button', { name: 'Descartar y cambiar' }));
  expect(screen.getByLabelText('Número de maceta')).toHaveValue('20 cm');
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(7500);
  expect(run).not.toHaveBeenCalled();
 });
 it('recupera solo el campo pendiente y conserva metadatos que no se tocaron', async () => {
  const run = vi.fn().mockResolvedValue({});
  function Recovered() {
   const [draft, onChange] = useState<InventoryDraft>({ ...emptyInventory(), ids: [plant.id], price: '3000', location: '', presentationContext: JSON.stringify([plant.id,'general']), presentationEdits: { price: true } });
   return <Inventory plants={[plant]} stocks={stocks} movements={[]} run={run} busy={false} draft={draft} onChange={onChange}/>;
  }
  render(<Recovered/>);
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(3000);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa norte');
  await userEvent.click(save());
  expect(run).toHaveBeenCalledWith('presentation', { plantId: plant.id, presentation: 'general', priceCRC: 3000 });
 });
 it('refleja cambios remotos de campos intactos mientras conserva la edición local de maceta', async () => {
  const { run, rerender } = mount();
  fireEvent.change(screen.getByLabelText('Número de maceta'), { target: { value: '16' } });
  rerender(<Inventory plants={[plant]} stocks={[{...stocks[0], priceCRC: 3200, location: 'Nueva mesa'}, stocks[1]]} movements={[]} scopedPlantId={plant.id} run={run} busy={false}/>);
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(3200);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Nueva mesa');
  expect(screen.getByLabelText('Número de maceta')).toHaveValue('16');
  await userEvent.click(save());
  expect(run).toHaveBeenCalledWith('presentation', { plantId: plant.id, presentation: 'general', potNumber: '16' });
 });
 it('usa los metadatos confirmados por el servidor al terminar de guardar', async () => {
  const run = vi.fn().mockResolvedValue({ stock: {...stocks[0], priceCRC: 3300, location: 'Mesa actualizada', potNumber: '18'} });
  mount(run);
  fireEvent.change(screen.getByLabelText('Número de maceta'), { target: { value: '18' } });
  await userEvent.click(save());
  expect(run).toHaveBeenCalledWith('presentation', { plantId: plant.id, presentation: 'general', potNumber: '18' });
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(3300);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa actualizada');
 });
 it('un fallo conserva el formulario y evita guardar dos veces mientras espera', async () => {
  let reject!: (error: Error) => void;
  const run = vi.fn(() => new Promise((_, no) => { reject = no; }));
  mount(run);
  fireEvent.change(screen.getByLabelText('Ubicación'), { target: { value: 'Mesa nueva' } });
  fireEvent.click(save()); fireEvent.click(save());
  expect(run).toHaveBeenCalledTimes(1); expect(save()).toBeDisabled();
  reject(new Error('fixture-error'));
  await waitFor(() => expect(screen.getByText(/Tus cambios siguen en el formulario/)).toBeInTheDocument());
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa nueva');
  expect(save()).toBeEnabled();
 });
 it('no acepta precios negativos ni decimales', () => {
  const { run } = mount();
  for (const price of ['-1', '10.50', '100000001']) {
   fireEvent.change(screen.getByLabelText('Precio CRC (opcional, entero)'), { target: { value: price } });
   expect(save()).toBeDisabled();
  }
  expect(run).not.toHaveBeenCalled();
 });
 it('un borrador antiguo con precio escrito no vacía los campos que omitía', async () => {
  const run = vi.fn().mockResolvedValue({});
  const draft = inventoryDraftSchema.parse({ ids:[plant.id], presentation:'general', quantity:1, type:'entry', reason:'', query:'', price:'4000', location:'' });
  render(<Inventory plants={[plant]} stocks={stocks} movements={[]} run={run} busy={false} draft={draft}/>);
  expect(screen.getByLabelText('Precio CRC (opcional, entero)')).toHaveValue(4000);
  expect(screen.getByLabelText('Ubicación')).toHaveValue('Mesa norte');
  await userEvent.click(save());
  expect(run).toHaveBeenCalledWith('presentation', { plantId: plant.id, presentation:'general', priceCRC:4000 });
 });
});


describe('movimiento pendiente de inventario', () => {
 const controlled = (initial = emptyInventory(), run = vi.fn().mockResolvedValue({})) => {
  let current = initial;
  function SavedDraft() {
   const [draft, onChange] = useState(initial); current = draft;
   return <Inventory plants={[plant]} stocks={stocks} movements={[]} run={run} busy={false} draft={draft} onChange={onChange}/>;
  }
  return { run, current: () => current, ...render(<SavedDraft/>) };
 };
 it.each(['quantity', 'type', 'reason'] as const)('marca el borrador al editar %s aunque la ficha de catálogo esté guardada', async field => {
  const result = controlled();
  expect(result.current().movementDirty).toBe(false);
  if (field === 'quantity') fireEvent.change(screen.getByLabelText('Cantidad por ficha'), {target:{value:'3'}});
  if (field === 'reason') fireEvent.change(screen.getByLabelText('Motivo'), {target:{value:'Ingreso nuevo'}});
  if (field === 'type') { await userEvent.click(screen.getByRole('combobox', {name:'Movimiento'})); await userEvent.click(screen.getByRole('option', {name:'Reserva'})); }
  expect(result.current().movementDirty).toBe(true);
  expect(result.run).not.toHaveBeenCalled();
 });
 it('seleccionar una ficha no marca un movimiento pendiente', async () => {
  const result = controlled();
  await userEvent.click(screen.getByRole('checkbox', {name:/Sansevieria/}));
  expect(result.current().ids).toEqual([plant.id]);
  expect(result.current().movementDirty).toBe(false);
 });
 it('conserva el movimiento tras un fallo y lo limpia solamente después del éxito', async () => {
  const run = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({stocks:stocks});
  const result = controlled({...emptyInventory(),ids:[plant.id]}, run);
  fireEvent.change(screen.getByLabelText('Cantidad por ficha'), {target:{value:'3'}});
  fireEvent.change(screen.getByLabelText('Motivo'), {target:{value:'Ingreso nuevo'}});
  await userEvent.click(screen.getByRole('button', {name:'Registrar movimiento'}));
  expect(result.current().movementDirty).toBe(true);
  expect(result.current().reason).toBe('Ingreso nuevo');
  expect(result.current().quantity).toBe(3);
  expect(result.current().ids).toEqual([plant.id]);
  await userEvent.click(screen.getByRole('button', {name:'Registrar movimiento'}));
  expect(run).toHaveBeenCalledTimes(2);
  expect(result.current().movementDirty).toBe(false);
  expect(result.current().reason).toBe('');
  expect(result.current().ids).toEqual([]);
 });
 it('recupera un movimiento sin registrar y no lo limpia al guardar la presentación', async () => {
  const recovered = inventoryDraftSchema.parse(JSON.parse(JSON.stringify({...emptyInventory(),ids:[plant.id],quantity:4,reason:'Recuperado',movementDirty:true})));
  const result = controlled(recovered);
  expect(screen.getByText('Tenés un movimiento de inventario sin registrar.')).toBeInTheDocument();
  expect(screen.getByLabelText('Cantidad por ficha')).toHaveValue(4);
  fireEvent.change(screen.getByLabelText('Número de maceta'), {target:{value:'16'}});
  await userEvent.click(save());
  expect(result.current().movementDirty).toBe(true);
  expect(result.current().reason).toBe('Recuperado');
  expect(result.current().quantity).toBe(4);
 });
});

describe('precios públicos autorizados', () => {
 it('no muestra un bloque de precio para fichas antiguas o sin opciones autorizadas', () => {
  const { rerender } = render(<PlantPrices/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  rerender(<PlantPrices priceOptions={[]}/>);
  expect(screen.queryByText('Precios y presentaciones')).not.toBeInTheDocument();
 });
 it('presenta precio y maceta por opción, sin inventar existencias', () => {
  render(<PlantPrices priceOptions={[{presentation:'grande',potNumber:'20 cm',priceCRC:7500},{presentation:'general',potNumber:'12',priceCRC:2500}]}/>);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('Maceta n.º 12')).toBeInTheDocument();
  expect(screen.getByText('Maceta n.º 20 cm')).toBeInTheDocument();
  expect(screen.getByText(/₡2[\s.]?500/)).toBeInTheDocument();
  expect(screen.getByText(/₡7[\s.]?500/)).toBeInTheDocument();
  expect(screen.queryByText(/disponibles|reservadas/)).not.toBeInTheDocument();
 });
 it('descarta importes inválidos y duplicados, y conserva un precio explícito de cero', () => {
  render(<PlantPrices priceOptions={[{presentation:'general',priceCRC:0},{presentation:'general',priceCRC:2500},{presentation:'negativa',priceCRC:-1},{presentation:'decimal',priceCRC:1.5},{presentation:'sin-precio',priceCRC:NaN}]}/>);
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('₡0')).toBeInTheDocument();
 });
});
