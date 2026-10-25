import { builtinModules } from 'module';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const builtinNames = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

const enforceStandaloneWorker: Plugin = {
  name: 'enforce-standalone-worker',
  generateBundle(_options, bundle) {
    const chunks = Object.values(bundle).filter(
      (output) => output.type === 'chunk',
    );
    if (chunks.length !== 1) {
      this.error(
        `Expected one standalone worker chunk, found ${chunks.length}.`,
      );
    }
    const unresolved = chunks.flatMap((chunk) =>
      [...chunk.imports, ...chunk.dynamicImports].filter(
        (specifier) => !builtinNames.has(specifier),
      ),
    );
    if (unresolved.length > 0) {
      this.error(
        `Worker bundle contains external non-builtin imports: ${[...new Set(unresolved)].join(', ')}`,
      );
    }
  },
};

export default defineConfig({
  ssr: { noExternal: true },
  plugins: [enforceStandaloneWorker],
  build: {
    ssr: true,
    emptyOutDir: false,
    lib: {
      entry: resolve(
        __dirname,
        'src/services/harness/runtime/OmpWorkerScript.ts',
      ),
      formats: ['es'],
      fileName: () => 'OmpWorkerScript.mjs',
    },
    outDir: 'dist',
    target: 'node22',
    rollupOptions: {
      external: (id) => builtinNames.has(id),
      output: {
        format: 'es',
        inlineDynamicImports: true,
      },
    },
    minify: false,
    sourcemap: false,
  },
});
