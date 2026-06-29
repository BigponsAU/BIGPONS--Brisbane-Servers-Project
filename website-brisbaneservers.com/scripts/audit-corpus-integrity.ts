#!/usr/bin/env npx tsx
/**
 * Audit and optionally repair corpus_documents (Neon).
 *
 *   npm run audit:corpus
 *   npm run audit:corpus -- --json
 *   npm run audit:corpus -- --repair
 *   npm run audit:corpus -- --repair --apply
 */
import { auditCorpusDocuments, corpusAuditExitCode, repairStringEncodedCorpusDocuments } from '../src/lib/corpus-integrity';
import { getSharedPool, usePostgres } from '../src/lib/db/pg-pool';

async function main(): Promise<void> {
  const asJson = process.argv.includes('--json');
  const repair = process.argv.includes('--repair');
  const apply = process.argv.includes('--apply');

  if (!usePostgres()) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const pool = getSharedPool();

  if (repair) {
    const result = await repairStringEncodedCorpusDocuments(pool, apply);
    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n[corpus] ${result.mode}: ${result.repairCount} string-encoded row(s)\n`);
      for (const row of result.repairs) {
        console.log(`  ${row.doc_key}: ${row.fromType} → ${row.toType}`);
      }
      if (!apply && result.repairCount > 0) {
        console.log('\nRe-run with --repair --apply to persist.\n');
      }
    }
    await pool.end();
    process.exit(0);
  }

  const report = await auditCorpusDocuments(pool);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const { summary } = report;
    console.log('\n[corpus] integrity audit\n');
    console.log(
      `ok=${summary.ok} missing=${summary.missing} string-encoded=${summary.stringEncoded} shape-mismatch=${summary.shapeMismatch}`,
    );
    if (summary.extraRows.length) console.log(`extra rows: ${summary.extraRows.join(', ')}`);
    console.log('');
    for (const row of report.rows) {
      if (row.status === 'ok') continue;
      console.log(`  ${row.doc_key}: ${row.status}${row.detail ? ` — ${row.detail}` : ''}`);
    }
    if (summary.stringEncoded + summary.shapeMismatch === 0) {
      console.log('\nNo corrupt corpus payloads. Missing keys use in-app defaults until first write.\n');
    }
  }

  await pool.end();
  process.exit(corpusAuditExitCode(report));
}

main().catch((e) => {
  console.error('[corpus]', e);
  process.exit(1);
});
