import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.wrangler', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // API loading and SSE handlers intentionally synchronize external data.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      globals: globals.worker,
    },
  },
  {
    files: ['*.js', 'tests/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
