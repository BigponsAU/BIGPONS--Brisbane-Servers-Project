import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/pages/api');
const line = 'export const prerender = false;\n';

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.ts') || entry.name === '_endpoint.ts') continue;

    let content = fs.readFileSync(full, 'utf8');
    content = content.replace(/^export \{ prerender \} from ['"].*_endpoint['"];\n/gm, '');
    if (!content.includes('export const prerender = false')) {
      content = line + content;
      fs.writeFileSync(full, content);
      console.log('fixed', path.relative(apiRoot, full));
    }
  }
}

walk(apiRoot);
