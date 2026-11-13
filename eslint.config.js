import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
 { ignores: ['dist/**', 'functions/lib/**', 'functions/node_modules/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
 js.configs.recommended,
 { files: ['**/*.mjs'], languageOptions: { globals: { process:'readonly', console:'readonly', Buffer:'readonly', crypto:'readonly', URL:'readonly' } } },
 ...tseslint.configs.recommended,
 { files: ['**/*.{ts,tsx}'], plugins: { 'react-hooks': hooks }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' } }
);
