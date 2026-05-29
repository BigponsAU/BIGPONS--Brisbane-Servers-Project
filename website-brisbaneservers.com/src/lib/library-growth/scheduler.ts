import { runDueLibraryGrowthCycle } from './run-cycle';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Optional in-process scheduler for the standalone API host.
 * Enable with LIBRARY_GROWTH_SCHEDULER=1 on the API process (Render/Railway/VPS).
 * Production can also use POST /api/cron/library-growth with CRON_SECRET.
 */
export function startLibraryGrowthScheduler(): void {
  if (process.env.LIBRARY_GROWTH_SCHEDULER !== '1') {
    return;
  }

  if (timer) {
    return;
  }

  const tick = async (): Promise<void> => {
    try {
      const result = await runDueLibraryGrowthCycle();
      if (result.ran) {
        console.info(
          `[library-growth] Scheduled cycle: created=${result.created} skipped=${result.skipped} next=${result.nextCycleAt ?? 'n/a'}`
        );
      }
    } catch (error) {
      console.error('[library-growth] Scheduled cycle failed:', error);
    }
  };

  void tick();
  timer = setInterval(() => void tick(), CHECK_INTERVAL_MS);
  console.info('[library-growth] In-process scheduler started (15m check interval)');
}
