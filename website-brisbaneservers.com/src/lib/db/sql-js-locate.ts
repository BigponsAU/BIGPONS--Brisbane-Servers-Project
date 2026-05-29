import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Resolve sql.js WASM assets regardless of Astro/Vite bundle `__dirname`. */
export function locateSqlJsFile(file: string): string {
  if (file.endsWith('.wasm')) {
    return require.resolve(`sql.js/dist/${file}`);
  }
  return require.resolve(`sql.js/dist/${file}`);
}
