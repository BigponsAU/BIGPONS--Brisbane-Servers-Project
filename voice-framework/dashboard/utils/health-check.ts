/**
 * Health Check Utility
 * Service health checks and system metrics
 */

import { TextStorage } from '../../storage/text-storage';
import { ProfileManager } from '../../storage/profile-manager';

/**
 * Health status for a service
 */
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  services: {
    textStorage: ServiceHealth;
    profileManager: ServiceHealth;
  };
}

/**
 * Check TextStorage health
 * 
 * @param textStorage - TextStorage instance
 * @returns ServiceHealth status
 */
export async function checkStorageHealth(textStorage: TextStorage): Promise<ServiceHealth> {
  try {
    // Try to get samples count as a health check
    const samples = textStorage.getSamples({});
    const principles = textStorage.getPrinciples();
    // Get all relationships by checking all principles
    const allRelationships = principles.flatMap(p => textStorage.getRelationships(p.id));

    return {
      status: 'healthy',
      message: 'Text storage is operational',
      details: {
        samplesCount: samples.length,
        principlesCount: principles.length,
        relationshipsCount: allRelationships.length
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Text storage check failed',
      details: {
        error: String(error)
      }
    };
  }
}

/**
 * Check ProfileManager health
 * 
 * @param profileManager - ProfileManager instance
 * @returns ServiceHealth status
 */
export async function checkProfileManagerHealth(profileManager: ProfileManager): Promise<ServiceHealth> {
  try {
    // Try to get all profiles as a health check
    const profiles = profileManager.getAllProfiles();
    const defaultProfile = profileManager.getDefaultProfile();

    return {
      status: 'healthy',
      message: 'Profile manager is operational',
      details: {
        profilesCount: profiles.length,
        hasDefaultProfile: defaultProfile !== null
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Profile manager check failed',
      details: {
        error: String(error)
      }
    };
  }
}

/**
 * Perform comprehensive health check
 * 
 * @param textStorage - TextStorage instance
 * @param profileManager - ProfileManager instance
 * @returns Complete health check result
 */
export async function performHealthCheck(
  textStorage: TextStorage,
  profileManager: ProfileManager
): Promise<HealthCheckResult> {
  const [storageHealth, profileHealth] = await Promise.all([
    checkStorageHealth(textStorage),
    checkProfileManagerHealth(profileManager)
  ]);

  // Determine overall status
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
  if (storageHealth.status === 'unhealthy' || profileHealth.status === 'unhealthy') {
    overallStatus = 'error';
  } else if (storageHealth.status === 'degraded' || profileHealth.status === 'degraded') {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      textStorage: storageHealth,
      profileManager: profileHealth
    }
  };
}

