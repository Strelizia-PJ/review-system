import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'dist-electron', 'release', 'coverage', 'node_modules', '**/*.cjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Legacy row-field accesses in migrations deliberately use `as any` for pre-schema data
      '@typescript-eslint/no-explicit-any': 'warn',
      // Ignored-error catch blocks are a deliberate pattern here
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
)
