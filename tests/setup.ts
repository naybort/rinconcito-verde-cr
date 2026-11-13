import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
// Unit tests use fixtures regardless of the developer's local Firebase configuration.
vi.stubEnv('VITE_FIREBASE_MODE', '');
if (typeof window !== 'undefined') {
 afterEach(() => { cleanup(); window.localStorage.clear(); window.history.replaceState(null, '', '/#/'); });
 Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
}
