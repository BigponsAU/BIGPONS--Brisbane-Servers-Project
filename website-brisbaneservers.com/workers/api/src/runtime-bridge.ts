import type { WorkerEnv } from './env';

/** Per-isolate runtime env for Astro API handlers (process.env + Workers bindings). */
let activeEnv: WorkerEnv | null = null;

declare global {
  // Workers AI binding (no REST token required on edge).
  var __WORKERS_AI_BINDING__: Ai | undefined;
}

export function bindWorkerRuntime(env: WorkerEnv): void {
  activeEnv = env;
  globalThis.__WORKERS_AI_BINDING__ = env.AI;

  const dbUrl = env.HYPERDRIVE?.connectionString?.trim();
  if (dbUrl) {
    process.env.DATABASE_URL = dbUrl;
  }

  process.env.EDGE_WORKER = '1';
  process.env.CORPUS_SKIP_FILE_MIRROR = '1';
  process.env.VOICE_STORAGE_DIR = '/tmp/brisbane-voice-storage';
  process.env.PUBLIC_SITE_URL = env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com';
  process.env.INFERENCE_PROVIDER = env.INFERENCE_PROVIDER ?? 'workers-ai';
  process.env.WORKERS_AI_MODEL = env.WORKERS_AI_MODEL ?? '@cf/meta/llama-3.1-8b-instruct';

  const secretKeys = [
    'JWT_SECRET',
    'RESEND_API_KEY',
    'AUTH_EMAIL_FROM',
    'AUTH_EMAIL_REPLY_TO',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI',
    'CRON_SECRET',
    'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN',
  ] as const;

  for (const key of secretKeys) {
    const value = env[key as keyof WorkerEnv];
    if (typeof value === 'string' && value.trim()) {
      process.env[key] = value.trim();
    }
  }
}

export function getActiveWorkerEnv(): WorkerEnv | null {
  return activeEnv;
}
