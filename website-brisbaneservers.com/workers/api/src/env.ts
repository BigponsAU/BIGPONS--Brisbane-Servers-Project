import type { HyperdriveBinding } from './lib/db';

export interface WorkerEnv {
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_REPLY_TO?: string;
  PUBLIC_SITE_URL?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  JWT_SECRET?: string;
  CRON_SECRET?: string;
  CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  INFERENCE_PROVIDER?: string;
  WORKERS_AI_MODEL?: string;
  CONTACT_QUEUE?: Queue;
  HYPERDRIVE?: HyperdriveBinding;
  AI?: Ai;
  USAGE_KV?: KVNamespace;
}
