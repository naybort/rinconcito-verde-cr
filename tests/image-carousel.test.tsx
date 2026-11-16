import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImageCarousel } from '../src/shared/gallery/ImageCarousel';
import { PlantSources } from '../src/features/catalog/PlantSources';

function Carousel({ count = 3, open = () => {} }: { count?: number; open?: () => void }) {
 const [index, setIndex] = useState(0);
 return <ImageCarousel count={count} index={index} onChange={setIndex} thumbnails={Array.from({ length: count }, (_, i) => <span>{i + 1}</span>)}><button onClick={open}>Ver imagen</button><input aria-label="Texto editable"/></ImageCarousel>;
}
describe('carrusel accesible', () => {
 it('admite una imagen y deshabilita navegación sin ocultar el contador', () => {
  render(<Carousel count={1}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Imagen 1 de 1');
  expect(screen.getByRole('button', { name: 'Imagen anterior' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Imagen siguiente' })).toBeDisabled();
 });
 it('navega por controles, miniaturas y teclado, respetando texto editable', async () => {
  render(<Carousel/>);
  await userEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }));
  expect(screen.getByRole('status')).toHaveTextContent('Imagen 2 de 3');
  const group = screen.getByRole('group');
  fireEvent.keyDown(group, { key: 'End' }); expect(screen.getByRole('status')).toHaveTextContent('Imagen 3 de 3');
  fireEvent.keyDown(group, { key: 'ArrowRight' }); expect(screen.getByRole('status')).toHaveTextContent('Imagen 1 de 3');
  await userEvent.click(screen.getByRole('button', { name: 'Seleccionar imagen 2' }));
  expect(screen.getByRole('button', { name: 'Seleccionar imagen 2' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowLeft' }); expect(screen.getByRole('status')).toHaveTextContent('Imagen 2 de 3');
 });
 it('desliza horizontalmente sin abrir el modal y deja los gestos verticales al scroll', () => {
  const open = vi.fn(); render(<Carousel open={open}/>);
  const stage = screen.getByTestId('carousel-stage');
  fireEvent.touchStart(stage, { touches: [{ clientX: 180, clientY: 100 }] });
  expect(fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 95, clientY: 110 }] })).toBe(true);
  expect(screen.getByRole('status')).toHaveTextContent('Imagen 2 de 3');
  fireEvent.click(screen.getByRole('button', { name: 'Ver imagen' })); expect(open).not.toHaveBeenCalled();
  fireEvent.touchStart(stage, { touches: [{ clientX: 180, clientY: 100 }] });
  expect(fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 165, clientY: 220 }] })).toBe(true);
  expect(screen.getByRole('status')).toHaveTextContent('Imagen 2 de 3');
  fireEvent.click(screen.getByRole('button', { name: 'Ver imagen' })); expect(open).toHaveBeenCalledOnce();
 });
});

it('solo presenta como verificadas fuentes con evidencia explícita, URL segura y fecha', () => {
 render(<PlantSources sources={[
  { title: 'Referencia con evidencia', url: 'https://example.test/source', accessedAt: '2026-11-13', verification: 'verified' },
  { title: 'Nota de vivero sin URL' },
  { title: 'Referencia heredada', url: 'https://example.test/legacy', accessedAt: '2026-11-13' },
  { title: 'Etiqueta incompleta', verification: 'verified' },
  { title: 'Enlace inválido', url: 'javascript:alert(1)', verification: 'verified', accessedAt: '2026-11-13' },
 ]}/>);
 const verified = screen.getByRole('region', { name: 'Fuentes verificadas' });
 expect(verified).toHaveTextContent('Referencia con evidencia'); expect(verified).not.toHaveTextContent('heredada');
 const unverified = screen.getByRole('region', { name: 'Referencias no verificadas' });
 expect(unverified).toHaveTextContent('Nota de vivero sin URL'); expect(unverified).toHaveTextContent('Referencia heredada');
 expect(unverified).toHaveTextContent('Etiqueta incompleta'); expect(screen.queryByRole('link', { name: 'Enlace inválido' })).not.toBeInTheDocument();
});
