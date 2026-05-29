/**
 * Local build matching Cloudflare Pages production env (root base path + canonical URL).
 */
import { spawnSync } from 'node:child_process';

const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com';
const base = process.env.PUBLIC_SITE_BASE ?? '/';

const env = {
  ...process.env,
  PUBLIC_SITE_BASE: base,
  PUBLIC_SITE_URL: siteUrl,
  SKIP_HOSTED_API_CHECK: process.env.SKIP_HOSTED_API_CHECK ?? 'true',
};

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 1);
