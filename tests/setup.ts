import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
// Unit tests use fixtures regardless of the developer's local Firebase configuration.
vi.stubEnv('VITE_FIREBASE_MODE', '');
afterEach(() => { cleanup(); window.localStorage.clear(); window.location.hash = '#/'; });
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
