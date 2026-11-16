// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { defaultLoadingSettings, loadingSettingsSchema, publicLoadingSettings, readLoadingSettings } from '../functions/src/loadingSettings';
import { generateLoadingTips } from '../functions/src/loadingTips';

it('expone solo título/subtítulo/animación y consejos activos revisados', () => {
 const settings = defaultLoadingSettings();
 settings.tips[1] = { ...settings.tips[1], active: false, reviewed: false };
 settings.tips[2] = { ...settings.tips[2], active: false };
 const record = { ...settings, updatedBy: 'private-uid', updatedAt: 'private-time', prompt: 'private-prompt' };
 expect(readLoadingSettings(record)).toEqual(settings);
 expect(publicLoadingSettings(record)).toEqual({ title: settings.title, subtitle: settings.subtitle, animation: 'watering', tips: [settings.tips[0].text] });
 expect(JSON.stringify(publicLoadingSettings(record))).not.toContain('private-');
});
it('rechaza consejos activos sin revisión, IDs repetidos, URLs de animaciones y tamaños excesivos', () => {
 const settings = defaultLoadingSettings();
 for (const value of [
  { ...settings, tips: [{ ...settings.tips[0], reviewed: false }] },
  { ...settings, tips: [settings.tips[0], settings.tips[0]] },
  { ...settings, animation: 'https://untrusted.test/script' },
  { ...settings, title: 'x'.repeat(121) },
  { ...settings, tips: [{ ...settings.tips[0], text: 'x'.repeat(241) }] },
 ]) expect(loadingSettingsSchema.safeParse(value).success).toBe(false);
 expect(publicLoadingSettings(undefined).tips.length).toBeGreaterThan(0);
});
const response = (tips: string[]) => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify({ tips }) }] }], usage: { output_tokens: 40 } }));
const config = { key: 'fixture-secret', textModel: 'fixture-model', requestId: 'fixture-job' };
it('genera consejos solo mediante transporte explícito y devuelve propuestas sin activar', async () => {
 const transport = vi.fn<typeof fetch>().mockResolvedValue(response(['Observá la tierra antes de regar.', 'Observá la tierra antes de regar.']));
 const result = await generateLoadingTips({ prompt: 'Consejos para plantas de interior.' }, config, transport);
 expect(result.proposal).toEqual({ tips: ['Observá la tierra antes de regar.'] });
 expect(transport).toHaveBeenCalledOnce();
 const body = JSON.parse(String(transport.mock.calls[0][1]?.body));
 expect(body.store).toBe(false); expect(body.tools).toBeUndefined();
 expect(body.instructions).toContain('never automatically published');
 expect(body.input[0].content[0].text).toContain(JSON.stringify('Consejos para plantas de interior.'));
 expect(JSON.stringify(result)).not.toContain('active'); expect(JSON.stringify(result)).not.toContain(config.key);
});
it('valida prompt antes del transporte y oculta errores del proveedor', async () => {
 const transport = vi.fn<typeof fetch>();
 await expect(generateLoadingTips({ prompt: '' }, config, transport)).rejects.toThrow();
 expect(transport).not.toHaveBeenCalled();
 transport.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: config.key, code: 'invalid_api_key' } }), { status: 401 }));
 await expect(generateLoadingTips({ prompt: 'Consejos cortos' }, config, transport)).rejects.not.toThrow(config.key);
});
it.each([
 { status: 'incomplete', output: [] },
 { output: [{ content: [{ type: 'refusal', refusal: 'no' }] }] },
 { output: [{ content: [{ type: 'output_text', text: '{invalid' }] }] },
 { output: [{ content: [{ type: 'output_text', text: JSON.stringify({ tips: ['x'.repeat(241)] }) }] }] },
])('no acepta una respuesta no revisable: %j', async body => {
 const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body)));
 await expect(generateLoadingTips({ prompt: 'Consejos cortos' }, config, transport)).rejects.toThrow();
});
