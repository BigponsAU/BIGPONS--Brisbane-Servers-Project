import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve to project root, then to voice-framework storage
const projectRoot = path.resolve(__dirname, '../../../../../');
const PROFILES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'profiles.json');

interface ProfileMetadata {
  name: string;
  description?: string;
  version: string;
  sourceDocument?: string;
  tags?: string[];
  isDefault?: boolean;
  archived?: boolean;
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileData {
  metadata: ProfileMetadata;
  profile: any;
}

interface ProfilesData {
  profiles: ProfileData[];
  version: string;
  lastUpdated: string;
  defaultProfileId?: string;
}

async function loadProfiles(): Promise<ProfilesData | null> {
  try {
    const data = await fs.readFile(PROFILES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[API] Error loading profiles:', error);
    return null;
  }
}

async function saveProfiles(data: ProfilesData): Promise<void> {
  await fs.writeFile(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  const { CORPUS_DOC_KEYS, importFileToCorpus } = await import('../../../lib/corpus-store');
  await importFileToCorpus(CORPUS_DOC_KEYS.PROFILES, PROFILES_FILE);
}

/**
 * Normalize profile name for comparison
 */
function normalizeProfileName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate semantic similarity between two profiles based on characteristics
 * Returns a score between 0 and 1 (1 = identical, 0 = completely different)
 */
function calculateProfileSimilarity(profile1: any, profile2: any): number {
  if (!profile1?.characteristics || !profile2?.characteristics) {
    return 0;
  }

  const c1 = profile1.characteristics;
  const c2 = profile2.characteristics;
  let similarityScore = 0;
  let totalWeight = 0;

  // Tone similarity (weight: 0.3)
  if (c1.tone && c2.tone) {
    const toneKeys = Object.keys(c1.tone);
    let toneMatches = 0;
    toneKeys.forEach(key => {
      if (c1.tone[key] === c2.tone[key]) {
        toneMatches++;
      }
    });
    const toneSimilarity = toneMatches / Math.max(toneKeys.length, Object.keys(c2.tone).length);
    similarityScore += toneSimilarity * 0.3;
    totalWeight += 0.3;
  }

  // Vocabulary similarity (weight: 0.25)
  if (c1.linguisticPatterns?.vocabulary && c2.linguisticPatterns?.vocabulary) {
    const v1 = c1.linguisticPatterns.vocabulary;
    const v2 = c2.linguisticPatterns.vocabulary;
    
    const vocabCategories = ['technicalTerms', 'descriptiveTerms', 'relationshipTerms'];
    let vocabSimilarity = 0;
    
    vocabCategories.forEach(cat => {
      const terms1 = new Set((v1[cat] || []).map((t: string) => t.toLowerCase()));
      const terms2 = new Set((v2[cat] || []).map((t: string) => t.toLowerCase()));
      
      const intersection = new Set([...terms1].filter(t => terms2.has(t)));
      const union = new Set([...terms1, ...terms2]);
      
      if (union.size > 0) {
        vocabSimilarity += intersection.size / union.size;
      }
    });
    
    similarityScore += (vocabSimilarity / vocabCategories.length) * 0.25;
    totalWeight += 0.25;
  }

  // Domain knowledge similarity (weight: 0.2)
  if (c1.domainKnowledge && c2.domainKnowledge) {
    const domainKeys = Object.keys(c1.domainKnowledge);
    let domainSimilarity = 0;
    
    domainKeys.forEach(key => {
      const concepts1 = new Set((c1.domainKnowledge[key] || []).map((c: string) => c.toLowerCase()));
      const concepts2 = new Set((c2.domainKnowledge[key] || []).map((c: string) => c.toLowerCase()));
      
      const intersection = new Set([...concepts1].filter(c => concepts2.has(c)));
      const union = new Set([...concepts1, ...concepts2]);
      
      if (union.size > 0) {
        domainSimilarity += intersection.size / union.size;
      }
    });
    
    if (domainKeys.length > 0) {
      similarityScore += (domainSimilarity / domainKeys.length) * 0.2;
      totalWeight += 0.2;
    }
  }

  // Voice markers similarity (weight: 0.15)
  if (c1.voiceMarkers && c2.voiceMarkers) {
    const markerKeys = Object.keys(c1.voiceMarkers);
    let markerSimilarity = 0;
    
    markerKeys.forEach(key => {
      const markers1 = new Set((c1.voiceMarkers[key] || []).map((m: string) => m.toLowerCase()));
      const markers2 = new Set((c2.voiceMarkers[key] || []).map((m: string) => m.toLowerCase()));
      
      const intersection = new Set([...markers1].filter(m => markers2.has(m)));
      const union = new Set([...markers1, ...markers2]);
      
      if (union.size > 0) {
        markerSimilarity += intersection.size / union.size;
      }
    });
    
    if (markerKeys.length > 0) {
      similarityScore += (markerSimilarity / markerKeys.length) * 0.15;
      totalWeight += 0.15;
    }
  }

  // Structural patterns similarity (weight: 0.1)
  if (c1.structuralPatterns && c2.structuralPatterns) {
    const struct1 = JSON.stringify(c1.structuralPatterns);
    const struct2 = JSON.stringify(c2.structuralPatterns);
    const structSimilarity = struct1 === struct2 ? 1 : 0;
    similarityScore += structSimilarity * 0.1;
    totalWeight += 0.1;
  }

  // Normalize by total weight
  return totalWeight > 0 ? similarityScore / totalWeight : 0;
}

/**
 * Check if two profiles are duplicates
 * Uses both name matching and semantic similarity
 */
function areProfilesDuplicate(p1: ProfileData, p2: ProfileData, similarityThreshold: number = 0.85): boolean {
  // Exact name match
  const name1 = normalizeProfileName(p1.metadata.name);
  const name2 = normalizeProfileName(p2.metadata.name);
  if (name1 === name2) {
    return true;
  }

  // Similar name (fuzzy match)
  if (name1.includes(name2) || name2.includes(name1)) {
    return true;
  }

  // Semantic similarity check
  const similarity = calculateProfileSimilarity(p1.profile, p2.profile);
  return similarity >= similarityThreshold;
}

/**
 * Merge two profiles, keeping the best version
 */
function mergeProfiles(keep: ProfileData, remove: ProfileData): ProfileData {
  // Prefer: default > non-default, newer version, newer date, more complete characteristics
  const merged: ProfileData = {
    metadata: { ...keep.metadata },
    profile: { ...keep.profile }
  };

  // Merge metadata - keep the better one
  if (remove.metadata.isDefault && !keep.metadata.isDefault) {
    merged.metadata = { ...remove.metadata };
    merged.profile = { ...remove.profile };
    return merged;
  }

  // Merge version - use higher version
  const keepVersion = parseFloat(keep.metadata.version) || 0;
  const removeVersion = parseFloat(remove.metadata.version) || 0;
  if (removeVersion > keepVersion) {
    merged.metadata.version = remove.metadata.version;
  }

  // Merge tags
  const allTags = new Set([
    ...(keep.metadata.tags || []),
    ...(remove.metadata.tags || [])
  ]);
  merged.metadata.tags = Array.from(allTags);

  // Merge characteristics - combine vocabulary and domain knowledge
  if (keep.profile?.characteristics && remove.profile?.characteristics) {
    const kc = keep.profile.characteristics;
    const rc = remove.profile.characteristics;

    // Merge vocabulary
    if (kc.linguisticPatterns?.vocabulary && rc.linguisticPatterns?.vocabulary) {
      const vocabCategories = ['technicalTerms', 'descriptiveTerms', 'relationshipTerms'];
      vocabCategories.forEach(cat => {
        const terms = new Set([
          ...(kc.linguisticPatterns.vocabulary[cat] || []),
          ...(rc.linguisticPatterns.vocabulary[cat] || [])
        ]);
        merged.profile.characteristics.linguisticPatterns.vocabulary[cat] = Array.from(terms);
      });
    }

    // Merge domain knowledge
    if (kc.domainKnowledge && rc.domainKnowledge) {
      Object.keys(rc.domainKnowledge).forEach(key => {
        const concepts = new Set([
          ...(merged.profile.characteristics.domainKnowledge[key] || []),
          ...(rc.domainKnowledge[key] || [])
        ]);
        merged.profile.characteristics.domainKnowledge[key] = Array.from(concepts);
      });
    }

    // Merge voice markers
    if (kc.voiceMarkers && rc.voiceMarkers) {
      Object.keys(rc.voiceMarkers).forEach(key => {
        const markers = new Set([
          ...(merged.profile.characteristics.voiceMarkers[key] || []),
          ...(rc.voiceMarkers[key] || [])
        ]);
        merged.profile.characteristics.voiceMarkers[key] = Array.from(markers);
      });
    }
  }

  merged.metadata.updatedAt = new Date().toISOString();
  return merged;
}

/**
 * Analyze duplicates without removing them
 * GET /api/profiles/deduplicate?analyze=true
 * Requires: Admin authentication
 */
export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Check authentication
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const analyzeOnly = url.searchParams.get('analyze') === 'true';
    
    if (!analyzeOnly) {
      return new Response(
        JSON.stringify({
          error: 'Use POST to deduplicate, or add ?analyze=true to analyze',
          code: 'INVALID_METHOD',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const profilesData = await loadProfiles();
    if (!profilesData || !profilesData.profiles) {
      return new Response(
        JSON.stringify({
          error: 'No profiles found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const profiles = profilesData.profiles;
    const similarities: Array<{
      profile1: { id: string; name: string };
      profile2: { id: string; name: string };
      similarity: number;
      isDuplicate: boolean;
    }> = [];

    // Calculate similarity matrix
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const similarity = calculateProfileSimilarity(profiles[i].profile, profiles[j].profile);
        if (similarity > 0.7) {
          similarities.push({
            profile1: {
              id: profiles[i].metadata.id,
              name: profiles[i].metadata.name
            },
            profile2: {
              id: profiles[j].metadata.id,
              name: profiles[j].metadata.name
            },
            similarity: similarity,
            isDuplicate: similarity >= 0.85
          });
        }
      }
    }

    const duplicatesFound = similarities.filter(s => s.isDuplicate).length;
    const similarFound = similarities.filter(s => !s.isDuplicate).length;

    const duration = Date.now() - startTime;
    console.log(`[API] GET /api/profiles/deduplicate - Analysis complete (${duration}ms)`);
    
    return new Response(
      JSON.stringify({
        totalProfiles: profiles.length,
        duplicatesFound,
        similarFound,
        similarities: similarities.map(s => ({
          ...s,
          similarityPercent: Math.round(s.similarity * 100)
        })),
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] GET /api/profiles/deduplicate - Error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Neural Library: Deduplicate profiles using semantic similarity
 * POST /api/profiles/deduplicate
 * Requires: Admin authentication
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Check authentication
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const similarityThreshold = body.similarityThreshold || 0.85;
    const mergeMode = body.mergeMode || 'intelligent'; // 'intelligent' or 'keep_best'

    console.log(`[API] POST /api/profiles/deduplicate - Starting neural deduplication (threshold: ${similarityThreshold})`);
    
    const profilesData = await loadProfiles();
    if (!profilesData || !profilesData.profiles) {
      return new Response(
        JSON.stringify({
          error: 'No profiles found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const profiles = [...profilesData.profiles];
    const deduplicated: ProfileData[] = [];
    const duplicates: Array<{ 
      kept: string; 
      removed: string[]; 
      similarity: number;
      reason: string;
    }> = [];
    const processed = new Set<string>();

    // Neural similarity analysis
    for (let i = 0; i < profiles.length; i++) {
      if (processed.has(profiles[i].metadata.id)) continue;

      const currentProfile = profiles[i];
      const duplicateGroup: ProfileData[] = [currentProfile];
      const duplicateIds: string[] = [];

      // Find all duplicates of this profile
      for (let j = i + 1; j < profiles.length; j++) {
        if (processed.has(profiles[j].metadata.id)) continue;

        if (areProfilesDuplicate(currentProfile, profiles[j], similarityThreshold)) {
          const similarity = calculateProfileSimilarity(currentProfile.profile, profiles[j].profile);
          duplicateGroup.push(profiles[j]);
          duplicateIds.push(profiles[j].metadata.id);
          processed.add(profiles[j].metadata.id);
        }
      }

      if (duplicateGroup.length > 1) {
        // Found duplicates - determine which to keep
        let keepProfile = duplicateGroup[0];
        const removedProfiles: ProfileData[] = [];

        if (mergeMode === 'intelligent') {
          // Intelligent merge: combine all duplicates
          let merged = keepProfile;
          for (let k = 1; k < duplicateGroup.length; k++) {
            merged = mergeProfiles(merged, duplicateGroup[k]);
            removedProfiles.push(duplicateGroup[k]);
          }
          keepProfile = merged;
        } else {
          // Keep best: prefer default, newer version, newer date
          for (let k = 1; k < duplicateGroup.length; k++) {
            const candidate = duplicateGroup[k];
            let shouldKeep = false;

            if (candidate.metadata.isDefault && !keepProfile.metadata.isDefault) {
              shouldKeep = true;
            } else if (candidate.metadata.isDefault === keepProfile.metadata.isDefault) {
              const candidateVersion = parseFloat(candidate.metadata.version) || 0;
              const keepVersion = parseFloat(keepProfile.metadata.version) || 0;
              
              if (candidateVersion > keepVersion) {
                shouldKeep = true;
              } else if (candidateVersion === keepVersion) {
                const candidateDate = new Date(candidate.metadata.createdAt);
                const keepDate = new Date(keepProfile.metadata.createdAt);
                if (candidateDate > keepDate) {
                  shouldKeep = true;
                }
              }
            }

            if (shouldKeep) {
              removedProfiles.push(keepProfile);
              keepProfile = candidate;
            } else {
              removedProfiles.push(candidate);
            }
          }
        }

        deduplicated.push(keepProfile);
        processed.add(keepProfile.metadata.id);

        // Track duplicates
        const similarity = duplicateGroup.length > 1 
          ? calculateProfileSimilarity(keepProfile.profile, duplicateGroup[1].profile)
          : 1.0;
        
        duplicates.push({
          kept: keepProfile.metadata.id,
          removed: removedProfiles.map(p => p.metadata.id),
          similarity: similarity,
          reason: mergeMode === 'intelligent' ? 'merged' : 'kept_best'
        });
      } else {
        // No duplicates - keep as is
        deduplicated.push(currentProfile);
        processed.add(currentProfile.metadata.id);
      }
    }

    const removedCount = profiles.length - deduplicated.length;

    if (removedCount === 0) {
      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/profiles/deduplicate - No duplicates found (${duration}ms)`);
      
      return new Response(
        JSON.stringify({
          message: 'No duplicate profiles found. All profiles are unique.',
          duplicatesFound: 0,
          profilesRemoved: 0,
          totalProfiles: profiles.length,
          similarityAnalysis: profiles.map(p => ({
            id: p.metadata.id,
            name: p.metadata.name,
            similarityScore: 0
          })),
          success: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Save deduplicated profiles
    profilesData.profiles = deduplicated;
    profilesData.lastUpdated = new Date().toISOString();
    await saveProfiles(profilesData);

    const duration = Date.now() - startTime;
    console.log(`[API] POST /api/profiles/deduplicate - Removed ${removedCount} duplicate(s) (${duration}ms)`);
    
    return new Response(
      JSON.stringify({
        message: `Successfully ${mergeMode === 'intelligent' ? 'merged' : 'removed'} ${removedCount} duplicate profile(s)`,
        duplicatesFound: duplicates.length,
        profilesRemoved: removedCount,
        totalProfiles: deduplicated.length,
        mergeMode: mergeMode,
        similarityThreshold: similarityThreshold,
        duplicates: duplicates.map(d => ({
          kept: d.kept,
          removed: d.removed,
          count: d.removed.length,
          similarity: Math.round(d.similarity * 100),
          reason: d.reason
        })),
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] POST /api/profiles/deduplicate - Error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
