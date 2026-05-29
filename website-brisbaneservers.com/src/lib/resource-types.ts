/**
 * Normative resource shape — see docs/project/RESOURCE_CONTRACT.md
 */

export type Visibility = 'public' | 'private' | 'starter';

export type ProcessingStatus = 'ready' | 'queued' | 'ocr' | 'embedding' | 'failed';

/** How the voice profile for this resource write was chosen (see resource-voice-profile.ts). */
export type VoiceProfileResolutionKind =
  | 'requested'
  | 'default'
  | 'library_ephemeral'
  | 'bundled';

export interface Resource {
  id: string;
  industry: string;
  topic: string;
  title: string;
  description: string;
  content: string;
  generatedAt: string;
  generatedBy?: string;
  ownerId?: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  isStarterBlock?: boolean;
  visibility?: Visibility;
  metadata?: {
    wordCount?: number;
    semanticLevel?: 'high' | 'medium' | 'normal';
    voiceScore?: number;
    /** Stored profile id when creation used a saved default or explicit selection. */
    voiceProfileId?: string;
    voiceProfileResolution?: VoiceProfileResolutionKind;
    /** Set when created via library growth (case study proposals). */
    growthKind?: 'case_study';
  };
  /** Embedding model id used for chunks (e.g. openai text-embedding-3-small) */
  embeddingModel?: string;
  /** Bump when re-running embed pipeline */
  embeddingVersion?: number;
  /** Deterministic chunk keys for this resource */
  chunkIds?: string[];
  /** Ingest / pipeline state for hub UI */
  processingStatus?: ProcessingStatus;
  sourceRef?: {
    kind: 'upload' | 'paste';
    filename?: string;
    mimeType?: string;
  };
}

export function isPublicResource(resource: Resource): boolean {
  if (resource.status !== 'published') {
    return false;
  }
  if (resource.visibility === undefined || resource.visibility === 'public') {
    return true;
  }
  /** Published starter curriculum is included in anonymous read-only catalog (static builds + public hub). */
  if (resource.visibility === 'starter') {
    return true;
  }
  return false;
}
