import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/pages/api');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.ts') || entry.name === '_endpoint.ts') continue;

    let content = fs.readFileSync(full, 'utf8');
    const next = content.replace(/^export const prerender = false;\n/gm, '');
    if (next !== content) {
      fs.writeFileSync(full, next);
      console.log('reverted', path.relative(apiRoot, full));
    }
  }
}

walk(apiRoot);
