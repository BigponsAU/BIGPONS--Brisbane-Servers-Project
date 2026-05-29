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
  /** Draft auto-publish when voice score >= this (uses pipeline threshold if unset). */
  autoPublishMinScore: number | null;
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
  autoPublishMinScore: null,
  lastCycleAt: null,
  nextCycleAt: null,
};
