import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteBuildId = String(
  process.env.CF_PAGES_COMMIT_SHA || process.env.PUBLIC_BUILD_ID || 'local-dev',
).slice(0, 12);

function writePublicBuildId() {
  fs.writeFileSync(path.join(__dirname, 'public', 'build-id.txt'), `${siteBuildId}\n`, 'utf8');
}

/** Canonical origin for URLs, sitemap, and social previews. Override per env (Cloudflare Pages, preview deploys). */
const rawSite = process.env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com';
const site = rawSite.replace(/\/$/, '');
const rawBase = process.env.PUBLIC_SITE_BASE ?? '/';
const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`;

// https://astro.build/config
export default defineConfig({
  site,
  base,
  srcDir: './src',
  // Production SEO: static HTML + publish-public-surfaces.ts (CDN purge + Pages deploy hook).
  // SSR for /resources/** deferred — Pages SESSION KV caused prod 500; static path is canonical.
  output: 'static',
  integrations: [
    {
      name: 'brisbane-build-id',
      hooks: {
        'astro:config:setup': () => {
          writePublicBuildId();
        },
        'astro:build:start': () => {
          writePublicBuildId();
        },
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
  },
  vite: {
    define: {
      'import.meta.env.PUBLIC_BUILD_ID': JSON.stringify(siteBuildId),
    },
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
        '@voice-framework': path.resolve(__dirname, '../voice-framework'),
      }
    },
    server: {
      watch: {
        usePolling: false,
        interval: 100
      },
    },
    build: {
      cssCodeSplit: true,
      cssMinify: true,
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          // Keep shared portal helpers out of account-workspace-app so lazy panels
          // (admin-users, etc.) do not create a circular chunk import.
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');
            if (
              normalized.includes('/src/scripts/portal-confirm-dialog')
              || normalized.includes('/src/scripts/portal-markov-tracker')
              || normalized.includes('/src/scripts/account-workspace-utils')
            ) {
              return 'portal-shared';
            }
          },
        },
      },
    },
    esbuild: {
      target: 'es2020',
      keepNames: true,
      charset: 'utf8',
      legalComments: 'none',
      logLevel: 'warning',
      platform: 'browser',
      sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false
    },
    css: {
      devSourcemap: true,
      postcss: undefined,
    }
  }
});
