import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../api');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!fullPath.endsWith('.ts')) continue;

    const original = fs.readFileSync(fullPath, 'utf8');
    const updated = original
      .replace(/from '\.\.\/\.\.\/\.\.\/\.\.\//g, "from '~/")
      .replace(/from '\.\.\/\.\.\/\.\.\//g, "from '~/")
      .replace(/from '\.\.\/\.\.\/utils\//g, "from '~/utils/");

    if (updated !== original) {
      fs.writeFileSync(fullPath, updated);
      console.log('updated', fullPath);
    }
  }
}

walk(apiRoot);
