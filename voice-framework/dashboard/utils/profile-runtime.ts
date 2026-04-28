import type { Request, Response } from 'express';
import type { VoiceProfile } from '../../models/voice-profile';
import { ProfileManager, type ProfileMetadata } from '../../storage/profile-manager';

export interface RuntimeProfile {
  id?: string;
  profile?: VoiceProfile;
  metadata?: ProfileMetadata;
}

export function getRequestedProfileId(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const data = input as { profileId?: unknown; options?: { profileId?: unknown } };
  const direct = typeof data.profileId === 'string' ? data.profileId.trim() : '';
  const fromOptions = typeof data.options?.profileId === 'string' ? data.options.profileId.trim() : '';
  return direct || fromOptions || undefined;
}

export function resolveRuntimeProfile(
  profileManager: ProfileManager | undefined,
  requestedProfileId?: string
): RuntimeProfile {
  if (!profileManager) return {};

  const profiles = profileManager.getAllProfiles();
  const fallbackMetadata = profiles.find((profile) => profile.isDefault) || profiles[0];
  const id = requestedProfileId || fallbackMetadata?.id;
  const profile = id ? profileManager.getProfile(id) : profileManager.getDefaultProfile();

  if (requestedProfileId && !profile) {
    throw new Error(`Voice profile not found: ${requestedProfileId}`);
  }

  const metadata = profiles.find((item) => item.id === id) || fallbackMetadata;
  return {
    id: metadata?.id || id,
    profile: profile || undefined,
    metadata,
  };
}

export function sendProfileNotFound(error: unknown, res: Response): boolean {
  if (error instanceof Error && error.message.startsWith('Voice profile not found:')) {
    res.status(404).json({
      error: error.message,
      code: 'PROFILE_NOT_FOUND',
      success: false,
    });
    return true;
  }

  return false;
}

export function getRequestRuntimeProfile(
  req: Request,
  profileManager?: ProfileManager
): RuntimeProfile {
  return resolveRuntimeProfile(profileManager, getRequestedProfileId(req.body));
}
