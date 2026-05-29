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

    const lines = fs.readFileSync(full, 'utf8').split('\n');
    const seen = new Set();
    const filtered = lines.filter((line) => {
      if (!line.includes('prerender') || !line.includes('_endpoint')) return true;
      if (seen.has('prerender')) return false;
      seen.add('prerender');
      return true;
    });
    if (filtered.length !== lines.length) {
      fs.writeFileSync(full, filtered.join('\n'));
      console.log('deduped', path.relative(apiRoot, full));
    }
  }
}

walk(apiRoot);
