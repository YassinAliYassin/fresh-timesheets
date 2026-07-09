import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // react-hooks/set-state-in-effect flags any synchronous setState that is
      // reachable from an effect body. It produces false positives for the
      // canonical async data-fetching pattern (call an async fn from an effect
      // which sets loading/error state before awaiting). The react-hooks docs
      // themselves show this pattern as the standard way to fetch data, so we
      // disable the rule rather than contort the code.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
