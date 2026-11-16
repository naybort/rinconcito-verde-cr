import { z } from 'zod';

export const LOADING_SETTINGS_PATH = 'siteSettings/publicLoading';
export const loadingAnimationSchema = z.enum(['watering', 'leaves', 'none']);
export type LoadingAnimation = z.infer<typeof loadingAnimationSchema>;
export const loadingTipSchema = z.object({
 id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
 text: z.string().trim().min(1).max(240),
 active: z.boolean(), reviewed: z.boolean(),
}).strict().refine(tip => !tip.active || tip.reviewed, { message: 'Revisá el consejo antes de activarlo.', path: ['active'] });
export const loadingSettingsSchema = z.object({
 revision: z.number().int().nonnegative(),
 title: z.string().trim().min(1).max(120),
 subtitle: z.string().trim().min(1).max(240),
 animation: loadingAnimationSchema,
 tips: z.array(loadingTipSchema).max(30).refine(tips => new Set(tips.map(tip => tip.id)).size === tips.length, 'Los consejos necesitan IDs únicos.'),
}).strict();
export type LoadingSettingsData = z.infer<typeof loadingSettingsSchema>;
export const publicLoadingSettingsSchema = z.object({
 title: z.string().trim().min(1).max(120), subtitle: z.string().trim().min(1).max(240),
 animation: loadingAnimationSchema, tips: z.array(z.string().trim().min(1).max(240)).max(30),
}).strict();
export type PublicLoadingSettings = z.infer<typeof publicLoadingSettingsSchema>;
export const fallbackLoadingTips = [
 'Antes de regar, revisá cómo está la tierra: cada planta y cada espacio tienen su propio ritmo.',
 'Observá tus plantas con frecuencia. Los cambios en sus hojas pueden ayudarte a reconocer qué necesitan.',
 'Al elegir una planta, contanos cuánta luz recibe su nuevo espacio para ayudarte a encontrar una buena opción.',
];
export function defaultLoadingSettings(): LoadingSettingsData {
 return {
  revision: 0, title: 'Un poquito de agua…', subtitle: 'Cada pequeño cuidado hace crecer tu rincón verde.', animation: 'watering',
  tips: fallbackLoadingTips.map((text, index) => ({ id: 'inicial-' + (index + 1), text, active: true, reviewed: true })),
 };
}
/** Project known fields, keeping private document metadata out of every returned configuration. */
export function readLoadingSettings(record: unknown): LoadingSettingsData {
 if (record == null) return defaultLoadingSettings();
 if (typeof record !== 'object' || Array.isArray(record)) throw new Error('La configuración de carga no es válida.');
 const value = record as Record<string, unknown>;
 return loadingSettingsSchema.parse(Object.fromEntries(Object.keys(loadingSettingsSchema.shape).map(key => [key, value[key]])));
}
export function publicLoadingSettings(record: unknown): PublicLoadingSettings {
 const settings = readLoadingSettings(record);
 return { title: settings.title, subtitle: settings.subtitle, animation: settings.animation, tips: settings.tips.filter(tip => tip.active && tip.reviewed).map(tip => tip.text) };
}
export function fallbackPublicLoadingSettings(): PublicLoadingSettings { return publicLoadingSettings(defaultLoadingSettings()); }
export const loadingTipsRequestSchema = z.object({ prompt: z.string().trim().min(3).max(2000) }).strict();
export const loadingTipsProposalSchema = z.object({ tips: z.array(z.string().trim().min(1).max(240)).min(1).max(8) }).strict();
