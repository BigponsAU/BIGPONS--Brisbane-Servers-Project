import { defineConfig } from 'astro/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  output: 'static',
  server: {
    port: 3000,
    host: true,
  },
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
  },
  vite: {
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
      // Local dev only: browser uses relative /api; Vite proxies to the API process.
      // Override with API_DEV_PROXY if your API is not on 127.0.0.1:3002.
      proxy: {
        '/api': process.env.API_DEV_PROXY ?? 'http://127.0.0.1:3002',
      },
    },
    build: {
      cssCodeSplit: false,
      cssMinify: true,
      assetsInlineLimit: 4096,
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
