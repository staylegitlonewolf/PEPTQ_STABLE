import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Keep lint focused on source. Build artifacts / vendor bundles / temp scripts will
  // always fail rules like no-unused-vars/no-undef and should not block CI.
  globalIgnores([
    'dist',
    'node_modules/**',
    '.lighthouse/**',
    'artifacts/**',
    'tmp/**',
    'UNKNOWN_Files/**',
    // This folder contains exported/bundled artifacts; treat as non-source.
    'BETA_WEBSITE_ONLY_FOLDER/**',
    // Legacy folders that may exist in older workspaces.
    'google-apps-script/**',
    'googleSheets/**',
    'backend_Google/**',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]', // allow CONSTANT_CASE and _private
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // This rule is overly strict for common UI patterns like closing menus on navigation.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
