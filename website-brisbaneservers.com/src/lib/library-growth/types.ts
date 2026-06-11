export type GrowthProposalKind = 'resource' | 'case_study';
export type GrowthProposalStatus = 'pending' | 'approved' | 'rejected' | 'materialized';
export type GrowthProposalSource = 'cycle' | 'manual' | 'analytics';

export interface GrowthProposal {
  id: string;
  kind: GrowthProposalKind;
  industry: string;
  topic: string;
  title: string;
  rationale: string;
  status: GrowthProposalStatus;
  source: GrowthProposalSource;
  /** Set when materialized into resources.json */
  resourceId?: string;
  estimatedVoiceScore?: number;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
}

export interface LibraryGrowthConfig {
  /** Admin allows scheduled cycles (settings only — does not run until scheduleArmed). */
  enabled: boolean;
  /**
   * Physical activation in the account workspace (or explicit API arm).
   * Cron and in-process scheduler only run when this is true.
   */
  scheduleArmed: boolean;
  scheduleArmedAt: string | null;
  scheduleArmedBy: string | null;
  /** Hours between automatic cycles (0 = manual only). */
  intervalHours: number;
  maxProposalsPerCycle: number;
  generateCaseStudies: boolean;
  /**
   * When true (default), growth never auto-publishes — drafts only until reviewed in Resources.
   * Set false and configure autoPublishMinScore to allow score-based auto-publish.
   */
  reviewOnlyPublish: boolean;
  /** Draft auto-publish when voice score >= this (only when reviewOnlyPublish is false). */
  autoPublishMinScore: number | null;
  /**
   * When true, pending proposals are generated into draft resources automatically
   * after each cycle (cron or manual) — still requires manual publish in Resources.
   */
  autoMaterializePending: boolean;
  /** Daily site-wide growth unit cap (template generate + index per proposal). */
  maxDailyGrowthUnits: number;
  /** Max proposals materialized per cycle (budget uses unitsPerMaterialize each). */
  maxUnitsPerCycle: number;
  /** Growth units charged per materialize (default 1). */
  unitsPerMaterialize: number;
  lastCycleAt: string | null;
  nextCycleAt: string | null;
}

export const defaultLibraryGrowthConfig: LibraryGrowthConfig = {
  enabled: false,
  scheduleArmed: false,
  scheduleArmedAt: null,
  scheduleArmedBy: null,
  intervalHours: 168,
  maxProposalsPerCycle: 5,
  generateCaseStudies: true,
  reviewOnlyPublish: true,
  autoPublishMinScore: null,
  autoMaterializePending: false,
  maxDailyGrowthUnits: 20,
  maxUnitsPerCycle: 5,
  unitsPerMaterialize: 1,
  lastCycleAt: null,
  nextCycleAt: null,
};
