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

    const content = fs.readFileSync(full, 'utf8');
    if (content.includes('export const prerender') || content.includes("from './_endpoint'") || content.includes("from '../_endpoint'")) {
      continue;
    }

    const relDir = path.relative(apiRoot, path.dirname(full));
    const depth = relDir === '' ? 0 : relDir.split(path.sep).length;
    const prefix = depth === 0 ? './' : `${'../'.repeat(depth)}`;
    const line = `export { prerender } from '${prefix}_endpoint';\n`;
    fs.writeFileSync(full, line + content);
    console.log('patched', path.relative(apiRoot, full));
  }
}

walk(apiRoot);
