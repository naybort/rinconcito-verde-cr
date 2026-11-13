export type AppCheckProviderName = 'recaptcha-v3' | 'recaptcha-enterprise';
export function appCheckProviderName(value?: string): AppCheckProviderName {
 const provider = value || 'recaptcha-v3';
 if (provider !== 'recaptcha-v3' && provider !== 'recaptcha-enterprise') throw new Error('VITE_FIREBASE_APPCHECK_PROVIDER debe ser recaptcha-v3 o recaptcha-enterprise.');
 return provider;
}
