/**
 * cPanel / traditional Node hosting (standalone server).
 * Default `astro.config.mjs` is the static Cloudflare Pages frontend config.
 *
 * Build: npm run build:cpanel
 * Run:  node ./dist/server/entry.mjs  (set HOST=0.0.0.0 PORT=3000 as needed)
 */
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawSite = process.env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com';
const site = rawSite.replace(/\/$/, '');

export default defineConfig({
  site,
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: Number(process.env.PORT) || 3000,
    host: true
  },
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto'
  },
  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
        '@voice-framework': path.resolve(__dirname, '../voice-framework')
      }
    },
    server: {
      watch: {
        usePolling: false,
        interval: 100
      }
    },
    build: {
      cssCodeSplit: false,
      cssMinify: true,
      assetsInlineLimit: 4096
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
      postcss: undefined
    }
  }
});
