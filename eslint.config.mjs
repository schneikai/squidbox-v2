import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      import: importPlugin,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...prettier.rules,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['**/tsconfig.json', '**/tsconfig.base.json'],
        },
      },
    },
  },
  // Node (Express API)
  {
    files: ['apps/api/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // React Native (Expo Mobile)
  {
    files: ['apps/mobile/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        URLSearchParams: 'readonly',
        RequestInit: 'readonly',
        __DEV__: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Shared packages - Node.js environment for twitter-api
  {
    files: ['packages/twitter-api/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        URLSearchParams: 'readonly',
        RequestInit: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-redeclare': 'off', // Allow Zod schema + type with same name
    },
  },
  // Shared packages - keep platform-neutral for contracts
  {
    files: ['packages/contracts/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      'import/no-nodejs-modules': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-redeclare': 'off', // Allow Zod schema + type with same name
    },
  },
  {
    ignores: ['**/dist/**', '**/build/**', '**/generated/**', '**/node_modules/**'],
  },
];
