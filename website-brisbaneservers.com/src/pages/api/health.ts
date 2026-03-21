import type { APIRoute } from 'astro';
import { getVoiceFramework } from '../../utils/voice-framework';
import { performHealthCheck } from '@voice-framework/dashboard/utils/health-check';

/**
 * Health check endpoint
 * GET /api/health
 * Returns detailed health status including service health and system metrics
 */
export const GET: APIRoute = async () => {
  try {
    const { textStorage, profileManager } = await getVoiceFramework();
    const healthResult = await performHealthCheck(textStorage, profileManager);
    
    // Map status to HTTP status code
    const statusCode = healthResult.status === 'ok' ? 200 : 
                       healthResult.status === 'degraded' ? 200 : 503;
    
    return new Response(
      JSON.stringify(healthResult),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    // If health check fails, return error response
    const message = error instanceof Error ? error.message : 'Health check failed';
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: message,
        services: {
          textStorage: {
            status: 'unhealthy',
            message: 'Unable to check storage health'
          },
          profileManager: {
            status: 'unhealthy',
            message: 'Unable to check profile manager health'
          }
        }
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
