import { useEffect, useRef, useState } from 'react';
import { fallbackPublicLoadingSettings, publicLoadingSettingsSchema, fallbackLoadingTips, type PublicLoadingSettings } from '../../../functions/src/loadingSettings';

export const PUBLIC_LOADING_TIMEOUT_MS = 1500;
export function publicLoadingEndpoint(env: Record<string, string | undefined>, hostname = typeof location === 'undefined' ? '' : location.hostname): string | null {
 if (env.VITE_FIREBASE_MODE === 'cloud' && env.VITE_FIREBASE_PROJECT_ID === 'rinconcito-verde-cr' && (env.VITE_FIREBASE_REGION || 'us-central1') === 'us-central1') return 'https://us-central1-rinconcito-verde-cr.cloudfunctions.net/getPublicLoadingSettings';
 if (env.VITE_FIREBASE_MODE === 'emulator' && ['localhost', '127.0.0.1'].includes(hostname) && ['demo-rinconcito-verde', 'demo-rinconcito-verde-tests'].includes(env.VITE_FIREBASE_PROJECT_ID ?? '')) {
  const port = Number(env.VITE_EMULATOR_FUNCTIONS_PORT || 15001);
  if (Number.isInteger(port) && port > 0 && port <= 65535) return `http://127.0.0.1:${port}/${env.VITE_FIREBASE_PROJECT_ID}/us-central1/getPublicLoadingSettings`;
 }
 return null;
}
/** Plain public GET only: no tokens, cookies, AI calls or administrative mutations. */
export async function loadPublicLoadingSettings(endpoint: string | null, fetcher: typeof fetch = fetch): Promise<PublicLoadingSettings> {
 if (!endpoint) return fallbackPublicLoadingSettings();
 const controller = new AbortController();
 let timer: ReturnType<typeof setTimeout> | undefined;
 try {
  const outcome = await Promise.race([
   (async () => {
    const response = await fetcher(endpoint, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (!response.ok) return fallbackPublicLoadingSettings();
    const parsed = publicLoadingSettingsSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : fallbackPublicLoadingSettings();
   })(),
   new Promise<PublicLoadingSettings>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(fallbackPublicLoadingSettings()); }, PUBLIC_LOADING_TIMEOUT_MS); }),
  ]);
  return outcome;
 } catch { return fallbackPublicLoadingSettings(); }
 finally { clearTimeout(timer); }
}
export function selectLoadingTip(config: PublicLoadingSettings, random = Math.random): string {
 const tips = config.tips.length ? config.tips : fallbackLoadingTips;
 const sample = random();
 const index = Number.isFinite(sample) ? Math.max(0, Math.min(tips.length - 1, Math.floor(sample * tips.length))) : 0;
 return tips[index];
}
export function usePublicLoadingSettings(enabled: boolean): PublicLoadingSettings | null {
 const [settings, setSettings] = useState<PublicLoadingSettings | null>(null);
 const pending = useRef<Promise<PublicLoadingSettings> | null>(null);
 useEffect(() => {
  if (!enabled) return;
  let cancelled = false;
  // StrictMode reuses the same read; a new public route entry gets a fresh boundary.
  pending.current ??= loadPublicLoadingSettings(publicLoadingEndpoint(import.meta.env));
  void pending.current.then(value => { if (!cancelled) setSettings(value); });
  return () => { cancelled = true; };
 }, [enabled]);
 return settings;
}
