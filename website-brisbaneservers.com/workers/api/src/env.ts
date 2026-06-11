import type { HyperdriveBinding } from './lib/db';

export interface WorkerEnv {
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_REPLY_TO?: string;
  RENDER_API_ORIGIN?: string;
  PUBLIC_SITE_URL?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  CONTACT_QUEUE?: Queue;
  HYPERDRIVE?: HyperdriveBinding;
  AI?: Ai;
  USAGE_KV?: KVNamespace;
}
