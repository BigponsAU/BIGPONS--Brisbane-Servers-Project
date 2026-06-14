import { createRequire } from 'node:module';

function createModuleRequire() {
  const base = import.meta.url;
  if (!base) {
    throw new Error('SQLite auth storage is unavailable in this runtime');
  }
  return createRequire(base);
}

const require = createModuleRequire();

/** Resolve sql.js WASM assets regardless of Astro/Vite bundle `__dirname`. */
export function locateSqlJsFile(file: string): string {
  if (!file || typeof file !== 'string') {
    throw new Error('sql.js asset path is missing');
  }
  if (file.endsWith('.wasm')) {
    return require.resolve(`sql.js/dist/${file}`);
  }
  return require.resolve(`sql.js/dist/${file}`);
}
