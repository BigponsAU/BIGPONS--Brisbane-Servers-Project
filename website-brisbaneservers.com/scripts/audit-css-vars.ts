#!/usr/bin/env node
/**
 * Fail if any var(--token) in src has no matching --token: definition anywhere in src.
 * Catches typos and legacy names after token renames (similar to the --section-max-padding bug).
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const defRe = /--([a-zA-Z0-9-]+)\s*:/g;
const varRe = /var\(\s*(--[a-zA-Z0-9-]+)\b/g;

async function main(): Promise<void> {
  const files = await glob('src/**/*.{css,astro}', { cwd: projectRoot, absolute: true });
  const defined = new Set<string>();
  const used = new Map<string, Array<{ file: string; line: number }>>();

  for (const abs of files) {
    const text = fs.readFileSync(abs, 'utf8');
    const rel = path.relative(projectRoot, abs).replace(/\\/g, '/');
    let m: RegExpExecArray | null;
    defRe.lastIndex = 0;
    while ((m = defRe.exec(text)) !== null) {
      defined.add(m[1]);
    }
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      varRe.lastIndex = 0;
      while ((m = varRe.exec(line)) !== null) {
        const name = m[1].slice(2);
        if (!used.has(name)) used.set(name, []);
        used.get(name)!.push({ file: rel, line: i + 1 });
      }
    });
  }

  const missing: { name: string; refs: { file: string; line: number }[] }[] = [];
  for (const [name, refs] of used) {
    if (defined.has(name)) continue;
    missing.push({ name, refs });
  }
  missing.sort((a, b) => a.name.localeCompare(b.name));

  if (missing.length === 0) {
    console.log(`✅ CSS var audit: all ${used.size} unique var() names are defined in src (${defined.size} property names).`);
    process.exit(0);
  }

  console.error(`❌ CSS var audit: ${missing.length} undefined token(s):\n`);
  for (const { name, refs } of missing) {
    const sample = refs[0];
    console.error(`  --${name} (${refs.length} use(s)) → ${sample.file}:${sample.line}`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
