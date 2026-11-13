export type AppCheckProviderName = 'recaptcha-v3' | 'recaptcha-enterprise';
export function appCheckProviderName(value?: string): AppCheckProviderName {
 const provider = value || 'recaptcha-v3';
 if (provider !== 'recaptcha-v3' && provider !== 'recaptcha-enterprise') throw new Error('VITE_FIREBASE_APPCHECK_PROVIDER debe ser recaptcha-v3 o recaptcha-enterprise.');
 return provider;
}

// Never render raw SDK messages: they can include URLs, credentials or provider data.
export function appCheckFailureMessage(error: unknown): string {
 const failure = error as { code?: unknown; customData?: { httpStatus?: unknown } } | null;
 const codes = ['recaptcha-error', 'fetch-network-error', 'fetch-status-error', 'fetch-parse-error', 'initial-throttle', 'throttled', 'timeout', 'token-missing'];
 const code = typeof failure?.code === 'string' && codes.some(value => failure.code === 'appCheck/' + value) ? failure.code : 'appCheck/no-verificado';
 const status = failure?.customData?.httpStatus;
 const http = typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? `; HTTP ${status}` : '';
 return `No se pudo verificar este navegador con App Check (${code}${http}). No se envió la operación. Revisá la conexión y la configuración de reCAPTCHA del sitio antes de volver a intentarlo.`;
}
