import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { blankDraft, draftPhotos, withPhotos } from '../functions/src/domain';
import { PhotoManager } from '../src/features/admin/PhotoManager';
import { DraftPhotoGallery } from '../src/features/admin/DraftPhotoGallery';
import { PrivatePhoto } from '../src/features/admin/PrivatePhoto';
const sdk = vi.hoisted(() => ({ getBlob: vi.fn(async () => new Blob(['private-image'])), compose: vi.fn(async () => new Blob(['branded-image'])), download: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ firebase: { storage: {} } }));
vi.mock('firebase/storage', () => ({ getBlob: sdk.getBlob, ref: (_storage: unknown, path: string) => path }));
vi.mock('../src/shared/brand/photoExport', () => ({ composeBrandedPhoto: sdk.compose }));
vi.mock('../src/shared/brand/identity', async importOriginal => ({ ...await importOriginal<object>(), downloadBlob: sdk.download }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
const photo = (src: string) => ({ image: { src, alt: src }, originalPath: '', approvedImagePath: '' });

it('edita la imagen seleccionada y mantiene su identidad al convertirla en portada', async () => {
 const changed = vi.fn();
 function Editor() {
  const [draft, setDraft] = useState(withPhotos({ ...blankDraft('plant'), name: 'Prueba' }, [photo('/images/monstera.png'), photo('/images/calathea.png')]));
  return <PhotoManager draft={draft} preview="" uploading={false} progress="" busy={false} onUpload={() => {}} onEnhance={() => {}} onChange={photos => { changed(photos); setDraft(withPhotos(draft, photos)); }}/>;
 }
 render(<Editor/>);
 expect(screen.getByRole('status')).toHaveTextContent('Imagen 1 de 2');
 await userEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }));
 fireEvent.change(screen.getByRole('textbox', { name: 'Descripción de la imagen 2' }), { target: { value: 'Detalle revisado' } });
 expect(changed.mock.lastCall?.[0][0].image.alt).toBe('/images/monstera.png');
 expect(changed.mock.lastCall?.[0][1].image.alt).toBe('Detalle revisado');
 await userEvent.click(screen.getByRole('button', { name: 'Usar imagen 2 como portada' }));
 expect(screen.getByRole('status')).toHaveTextContent('Imagen 1 de 2');
 expect(screen.getByRole('textbox', { name: 'Descripción de la fotografía' })).toHaveValue('Detalle revisado');
 expect(changed.mock.lastCall?.[0][0].image.src).toBe('/images/calathea.png');
 await userEvent.click(screen.getByRole('button', { name: 'Quitar imagen 1' }));
 expect(screen.getByRole('status')).toHaveTextContent('Imagen 1 de 1');
 expect(changed.mock.lastCall?.[0][0].image.src).toBe('/images/monstera.png');
});
it('la descarga de revisión pasa por composición con marca sin modificar el borrador', async () => {
 const draft = withPhotos({ ...blankDraft('plant'), name: 'Prueba' }, [photo('/images/monstera.png')]);
 const before = structuredClone(draft);
 render(<DraftPhotoGallery draft={draft}/>);
 await userEvent.click(screen.getByRole('button', { name: /^Ver imagen$/ }));
 const modal = screen.getByRole('dialog');
 await userEvent.click(within(modal).getByRole('button', { name: 'Descargar imagen' }));
 await waitFor(() => expect(sdk.download).toHaveBeenCalledOnce());
 expect(sdk.compose).toHaveBeenCalledWith('/images/monstera.png');
 expect(sdk.download.mock.calls[0][1]).toBe('plant-foto-1-rinconcito-verde.png');
 expect(draft).toEqual(before); expect(draftPhotos(draft)[0].approvedImagePath).toBe('');
});
it('libera URLs privadas al cambiar la imagen y no conserva una imagen de otra ruta', async () => {
 let sequence = 0; const createObjectURL = vi.fn(() => 'blob:private-' + ++sequence), revokeObjectURL = vi.fn();
 vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; });
 const view = render(<PrivatePhoto path="originals/a/one" label="Imagen privada"/>);
 await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:private-1'));
 view.rerender(<PrivatePhoto path="originals/a/two" label="Imagen privada"/>);
 expect(screen.queryByRole('img')).not.toBeInTheDocument();
 await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:private-2'));
 expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-1');
 view.unmount(); expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-2');
});

it('volver a una ruta mientras otra descarga sigue pendiente no reutiliza URLs revocadas', async () => {
 let sequence = 0; const createObjectURL = vi.fn(() => 'blob:private-' + ++sequence), revokeObjectURL = vi.fn();
 vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; });
 const view = render(<PrivatePhoto path="originals/a/one" label="Imagen privada"/>);
 await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:private-1'));
 let finishMiddle!: (blob: Blob) => void;
 sdk.getBlob.mockImplementationOnce(() => new Promise<Blob>(resolve => { finishMiddle = resolve; }));
 view.rerender(<PrivatePhoto path="originals/a/two" label="Imagen privada"/>);
 view.rerender(<PrivatePhoto path="originals/a/one" label="Imagen privada"/>);
 expect(screen.queryByRole('img')).not.toBeInTheDocument();
 await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:private-2'));
 await act(async () => { finishMiddle(new Blob(['obsolete'])); });
 expect(createObjectURL).toHaveBeenCalledTimes(2);
 expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-1');
 view.unmount();
});
