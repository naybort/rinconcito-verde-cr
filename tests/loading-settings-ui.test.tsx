import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { defaultLoadingSettings, type LoadingSettingsData } from '../functions/src/loadingSettings';
import { LoadingSettings } from '../src/features/admin/LoadingSettings';

function runner() {
 return vi.fn(async (action: string, payload: unknown) => action === 'getLoadingSettings' ? { settings: defaultLoadingSettings() } : action === 'saveLoadingSettings' ? { settings: { ...(payload as LoadingSettingsData), revision: 1 } } : { jobId: 'tip-job' });
}
it('editar un consejo lo desactiva y exige revisión explícita antes de activarlo y guardar', async () => {
 const run = runner(); render(<LoadingSettings run={run} busy={false} jobs={[]}/>);
 const input = screen.getByLabelText('Texto del consejo 1'); await waitFor(() => expect(input).toBeEnabled());
 fireEvent.change(input, { target: { value: 'Un consejo escrito a mano.' } });
 const row = screen.getByRole('region', { name: 'Consejo 1' });
 expect(within(row).getByLabelText('Revisé este consejo')).not.toBeChecked();
 expect(within(row).getByLabelText('Mostrar al público')).not.toBeChecked(); expect(within(row).getByLabelText('Mostrar al público')).toBeDisabled();
 await userEvent.click(within(row).getByLabelText('Revisé este consejo'));
 await userEvent.click(within(row).getByLabelText('Mostrar al público'));
 await userEvent.click(screen.getByRole('button', { name: 'Guardar bienvenida' }));
 await waitFor(() => expect(run).toHaveBeenCalledWith('saveLoadingSettings', expect.objectContaining({ tips: expect.arrayContaining([expect.objectContaining({ text: 'Un consejo escrito a mano.', reviewed: true, active: true })]) })));
 expect(run.mock.calls.some(([action]) => action === 'requestLoadingTips')).toBe(false);
});
it('las propuestas requieren un clic para agregarse y quedan como borradores no revisados', async () => {
 const run = runner(); render(<LoadingSettings run={run} busy={false} jobs={[{ id: 'job-1', kind: 'loadingTips', status: 'ready', proposal: { tips: ['Consejo de IA pendiente de revisar.'] } }]}/>);
 await waitFor(() => expect(screen.getByLabelText('Título de bienvenida')).toBeEnabled());
 expect(screen.getAllByRole('textbox').some(input => (input as HTMLInputElement).value === 'Consejo de IA pendiente de revisar.')).toBe(false);
 await userEvent.click(screen.getByRole('button', { name: 'Agregar como borradores' }));
 const row = screen.getByRole('region', { name: 'Consejo 1' });
 expect(within(row).getByRole('textbox')).toHaveValue('Consejo de IA pendiente de revisar.');
 expect(within(row).getByLabelText('Revisé este consejo')).not.toBeChecked(); expect(within(row).getByLabelText('Mostrar al público')).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Instrucciones para los consejos'), { target: { value: 'Consejos sobre observación del vivero.' } });
 expect(run.mock.calls.some(([action]) => action === 'requestLoadingTips')).toBe(false);
 await userEvent.click(screen.getByRole('button', { name: 'Solicitar sugerencias de consejos' }));
 expect(run).toHaveBeenCalledWith('requestLoadingTips', { prompt: 'Consejos sobre observación del vivero.' });
 expect(run.mock.calls.filter(([action]) => action === 'requestLoadingTips')).toHaveLength(1);
});

it('una lectura fallida no permite guardar valores predeterminados sobre la configuración existente', async () => {
 const run = vi.fn(async () => undefined); render(<LoadingSettings run={run} busy={false} jobs={[]}/>);
 await screen.findByText('No pudimos cargar la configuración. Reintentá antes de guardar.');
 expect(screen.getByLabelText('Título de bienvenida')).toBeDisabled();
 expect(screen.getByRole('button', { name: 'Guardar bienvenida' })).toBeDisabled();
 expect(screen.getByRole('button', { name: 'Solicitar sugerencias de consejos' })).toBeDisabled();
 expect(run).toHaveBeenCalledExactlyOnceWith('getLoadingSettings', {});
});
