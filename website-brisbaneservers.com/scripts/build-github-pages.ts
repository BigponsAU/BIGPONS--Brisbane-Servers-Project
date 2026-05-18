/**
 * Local build matching GitHub Actions Pages env (project-site base path).
 */
import { spawnSync } from 'node:child_process';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'BIGPONS--Brisbane-Servers-Project';
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? 'BigponsAU';
const base = process.env.PUBLIC_SITE_BASE ?? `/${repoName}/`;
const siteUrl =
  process.env.PUBLIC_SITE_URL ?? `https://${owner}.github.io/${repoName.replace(/\/$/, '')}`;

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
