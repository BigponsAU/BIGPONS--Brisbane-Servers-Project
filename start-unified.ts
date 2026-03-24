#!/usr/bin/env node
/**
 * Unified Start Script
 * Starts both the website (port 3000) and voice framework dashboard (port 3001)
 * with port availability checking and health verification
 */

import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as http from 'http';
import { Extrapolator } from './voice-framework/generators/extrapolator';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEBSITE_PORT = 3000;
const DASHBOARD_PORT = 3001;
const HEALTH_CHECK_RETRIES = 10;
const HEALTH_CHECK_INITIAL_INTERVAL = 1000; // Initial interval: 1 second
const HEALTH_CHECK_MAX_INTERVAL = 10000; // Maximum interval: 10 seconds
const STARTUP_TIMEOUT = 120000; // 2 minutes total timeout for startup

let websiteProcess: ChildProcess | null = null;
let dashboardProcess: ChildProcess | null = null;
let extrapolator: Extrapolator;

// Initialize extrapolator for status messages
try {
  extrapolator = new Extrapolator();
} catch (error) {
  console.warn('⚠️  Could not initialize extrapolator, using default messages');
  // Create a minimal fallback extrapolator-like object
  // Note: Must match ExtrapolationOptions interface signature
  extrapolator = {
    extrapolate: (seed: string, options?: { expansionLevel?: 'minimal' | 'moderate' | 'extensive'; addExamples?: boolean; addDetails?: boolean }) => seed
  } as Extrapolator;
}

/**
 * Generate status message using extrapolator
 */
function generateStatusMessage(seed: string): string {
  if (!extrapolator) {
    return seed;
  }
  try {
    // Use extrapolator to enhance the message while keeping it concise
    const expanded = extrapolator.extrapolate(seed, {
      expansionLevel: 'minimal',
      addExamples: false,
      addDetails: false
    });
    // Extract first sentence to keep it concise
    return expanded.split(/[.!?]/)[0] || seed;
  } catch (error) {
    return seed;
  }
}

/**
 * Check if a port is available
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Check port availability before starting
 */
async function checkPorts(): Promise<boolean> {
  console.log('\n🔍 ' + generateStatusMessage('Verifying port availability with mathematical precision...'));
  
  const websiteAvailable = await checkPortAvailable(WEBSITE_PORT);
  const dashboardAvailable = await checkPortAvailable(DASHBOARD_PORT);
  
  if (!websiteAvailable) {
    console.error(`❌ Port ${WEBSITE_PORT} is already in use (website)`);
    return false;
  }
  
  if (!dashboardAvailable) {
    console.error(`❌ Port ${DASHBOARD_PORT} is already in use (dashboard)`);
    return false;
  }
  
  console.log(`✅ Port ${WEBSITE_PORT} available (website)`);
  console.log(`✅ Port ${DASHBOARD_PORT} available (dashboard)`);
  return true;
}

/**
 * Check if a service is healthy by making an HTTP request
 * 
 * For website (static site): Accepts 200 (OK) or 404 (server responding but route not found)
 * For dashboard: Expects 200 from /api/health endpoint
 */
function checkHealth(url: string, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout }, (res) => {
      // 200 = healthy, 404 = server responding (acceptable for static site root check)
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });
    
    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for service to become healthy with exponential backoff
 * 
 * Uses exponential backoff to gradually increase wait time between retries:
 * - First retry: 1 second
 * - Second retry: 2 seconds
 * - Third retry: 4 seconds
 * - And so on, capped at 10 seconds
 */
async function waitForHealth(
  name: string,
  url: string,
  maxRetries: number = HEALTH_CHECK_RETRIES
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const isHealthy = await checkHealth(url);
    if (isHealthy) {
      return true;
    }
    
    // Exponential backoff: interval = min(initial * 2^i, max_interval)
    const interval = Math.min(
      HEALTH_CHECK_INITIAL_INTERVAL * Math.pow(2, i),
      HEALTH_CHECK_MAX_INTERVAL
    );
    
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

/**
 * Verify both services are healthy
 * 
 * Health Check Strategy:
 * - Website (port 3000): Try `/api/health` first (200 = ok); fallback to `/` (200/404).
 * - Dashboard (port 3001): `/api/health` returns detailed health status.
 */
async function verifyHealth(): Promise<boolean> {
  console.log('\n🔍 ' + generateStatusMessage('Ascertaining service health with systematic verification...'));
  
  const websiteHealthUrl = `http://localhost:${WEBSITE_PORT}/api/health`;
  const websiteUrl = `http://localhost:${WEBSITE_PORT}`;
  // Dashboard: Has dedicated /api/health endpoint for detailed health status
  const dashboardUrl = `http://localhost:${DASHBOARD_PORT}/api/health`;
  
  process.stdout.write(`   Checking website (${WEBSITE_PORT})`);
  let websiteHealthy = await waitForHealth('website', websiteHealthUrl);
  if (!websiteHealthy) {
    websiteHealthy = await waitForHealth('website (root)', websiteUrl);
  }
  console.log(websiteHealthy ? ' ✅' : ' ❌');
  
  process.stdout.write(`   Checking dashboard (${DASHBOARD_PORT})`);
  const dashboardHealthy = await waitForHealth('dashboard', dashboardUrl);
  console.log(dashboardHealthy ? ' ✅' : ' ❌');
  
  return websiteHealthy && dashboardHealthy;
}

/**
 * Start the website service
 */
function startWebsite(): ChildProcess {
  const websiteDir = path.join(__dirname, 'website-brisbaneservers.com');
  const isWindows = process.platform === 'win32';
  
  return spawn(
    isWindows ? 'npm.cmd' : 'npm',
    ['run', 'dev'],
    {
      cwd: websiteDir,
      stdio: 'inherit',
      shell: isWindows
    }
  );
}

/**
 * Start the dashboard service
 */
function startDashboard(): ChildProcess {
  const dashboardDir = path.join(__dirname, 'voice-framework');
  const isWindows = process.platform === 'win32';
  
  return spawn(
    isWindows ? 'npm.cmd' : 'npm',
    ['run', 'dashboard'],
    {
      cwd: dashboardDir,
      stdio: 'inherit',
      shell: isWindows
    }
  );
}

/**
 * Cleanup function to kill child processes
 */
function cleanup() {
  console.log('\n\n🛑 Shutting down services...');
  
  if (websiteProcess) {
    websiteProcess.kill('SIGTERM');
    websiteProcess = null;
  }
  
  if (dashboardProcess) {
    dashboardProcess.kill('SIGTERM');
    dashboardProcess = null;
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

/**
 * Main function with startup timeout protection
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(generateStatusMessage('Starting services with comprehensive integration...'));
  console.log('='.repeat(60));
  
  // Create a promise that rejects after STARTUP_TIMEOUT
  const startupTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Startup timeout: Services failed to start within ${STARTUP_TIMEOUT / 1000} seconds`));
    }, STARTUP_TIMEOUT);
  });
  
  // Wrap the actual startup logic in a promise
  const startupProcess = (async () => {
    // Check ports before starting
    const portsAvailable = await checkPorts();
    if (!portsAvailable) {
      throw new Error('Ports are not available. Please free the ports and try again.');
    }
    
    // Start services
    console.log('\n🚀 Starting services...');
    console.log(`   Website: http://localhost:${WEBSITE_PORT}`);
    console.log(`   Dashboard: http://localhost:${DASHBOARD_PORT}`);
    
    websiteProcess = startWebsite();
    dashboardProcess = startDashboard();
    
    // Create a promise to handle process errors and early exits
    const processCheck = new Promise<void>((resolve, reject) => {
      let resolved = false;
      
      const handleError = (service: string, error: Error) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to start ${service}: ${error.message}`));
        }
      };
      
      const handleExit = (service: string, code: number | null) => {
        if (code !== 0 && code !== null && !resolved) {
          resolved = true;
          reject(new Error(`${service} process exited immediately with code ${code}`));
        }
      };
      
      // Handle process errors
      websiteProcess?.on('error', (error) => handleError('website', error));
      dashboardProcess?.on('error', (error) => handleError('dashboard', error));
      
      // Handle early exits (non-zero exit codes indicate failure)
      websiteProcess?.once('exit', (code) => handleExit('Website', code));
      dashboardProcess?.once('exit', (code) => handleExit('Dashboard', code));
      
      // Give processes a moment to start before resolving
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 2000);
    });
    
    await processCheck;
    
    // Wait a bit for services to start
    console.log('\n⏳ Waiting for services to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify health
    const healthy = await verifyHealth();
    
    if (healthy) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ All services are running and healthy!');
      console.log('='.repeat(60));
      console.log(`\n📱 Website:    http://localhost:${WEBSITE_PORT}`);
      console.log(`📊 Dashboard:  http://localhost:${DASHBOARD_PORT}`);
      console.log('\nPress Ctrl+C to stop all services\n');
    } else {
      throw new Error('Services started but health checks failed after all retries');
    }
  })();
  
  try {
    // Race between startup and timeout
    await Promise.race([startupProcess, startupTimeout]);
    
    // Handle graceful shutdown
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Error starting services: ${message}`);
    console.error('   This may indicate:');
    console.error('   - Services failed to start');
    console.error('   - Services took too long to become healthy');
    console.error('   - Port conflicts or configuration issues');
    cleanup();
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});

