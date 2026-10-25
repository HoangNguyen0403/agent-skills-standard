import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
    },
    outDir: 'dist',
    target: 'node22',
    rollupOptions: {
      output: {
        dynamicImportInCjs: false,
      },
      external: [
        /^node:.*/,
        /^@getpaseo\/.*/,
        '@getpaseo/client',
        '@getpaseo/client/node',
        'commander',
        'dotenv',
        'fs-extra',
        'inquirer',
        'js-yaml',
        'picocolors',
        'zod',
      ],
    },
    minify: false,
    sourcemap: true,
  },
  define: {
    'process.env.FEEDBACK_API_URL': JSON.stringify(
      process.env.FEEDBACK_API_URL,
    ),
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/__tests__/**',
        'src/scripts/**',
        'src/models/**',
        'src/constants/**',
      ],
    },
  },
});
