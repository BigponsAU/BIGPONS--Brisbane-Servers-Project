#!/usr/bin/env npx tsx
/**
 * Run a library growth cycle on the API host.
 *
 * Examples:
 *   npx tsx scripts/library-growth-cycle.ts          # force one cycle (admin "Run now")
 *   npx tsx scripts/library-growth-cycle.ts --due    # respect interval + nextCycleAt
 *
 * Production alternative: POST /api/cron/library-growth with Authorization: Bearer $CRON_SECRET
 */
import { loadLibraryGrowthConfig } from '../src/lib/library-growth/config';
import { runDueLibraryGrowthCycle, runLibraryGrowthCycle } from '../src/lib/library-growth/run-cycle';

async function main(): Promise<void> {
  const dueOnly = process.argv.includes('--due');
  const config = await loadLibraryGrowthConfig();

  if (!config.enabled) {
    console.log('[library-growth] Skipped — growth automation is disabled in config.');
    process.exit(0);
  }

  const result = dueOnly ? await runDueLibraryGrowthCycle() : await runLibraryGrowthCycle();

  if (!result.ran) {
    console.log(`[library-growth] No cycle run: ${result.reason ?? 'unknown'}`);
    process.exit(0);
  }

  console.log(
    `[library-growth] Cycle complete: created=${result.created} skipped=${result.skipped} next=${result.nextCycleAt ?? 'manual'}`
  );
}

main().catch((error) => {
  console.error('[library-growth] Failed:', error);
  process.exit(1);
});
