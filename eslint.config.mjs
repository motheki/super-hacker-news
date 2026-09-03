import { defineConfig } from 'eslint/config'
import eslintNextPlugin from '@next/eslint-plugin-next'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextTs,
  ...nextVitals,
  ...prettier,
  {
    globalIgnores: [
      // Default ignores of eslint-config-next:
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': eslintNextPlugin,
    },
    settings: {
      next: {
        rootDir: 'packages/my-app/',
      },
    },
  },
])
export default eslintConfig
