import { defineConfig } from 'astro/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Canonical origin for URLs, sitemap, and social previews. Override per env (e.g. preview deploys). */
const rawSite = process.env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com';
const site = rawSite.replace(/\/$/, '');
const rawBase = process.env.PUBLIC_SITE_BASE ?? '/';
const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`;

// https://astro.build/config
export default defineConfig({
  site,
  base,
  srcDir: './src-static',
  output: 'static',
  server: {
    port: 3000,
    host: true,
    // HMR is enabled by default in Astro - no need to configure manually
  },
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
    /* Automatically inline small stylesheets for better performance */
  },
  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
        '~static': path.resolve(__dirname, './src-static'),
        // Resolve @voice-framework to repo root (O1/voice-framework) for the standalone API.
        '@voice-framework': path.resolve(__dirname, '../voice-framework'),
      }
    },
    // Development server configuration
    server: {
      watch: {
        // Watch for changes in src directory
        usePolling: false,
        interval: 100
      },
      // API routes are now handled by Astro API endpoints (no proxy needed)
      // HMR is handled by Astro automatically
    },
    build: {
      cssCodeSplit: false,
      /* Single CSS file for static site - better caching */
      cssMinify: true,
      /* Minify CSS in production */
      assetsInlineLimit: 4096,
      /* Inline assets smaller than 4KB (base64) */
    },
    esbuild: {
      // Optimize for the Flower-of-Life Semantic Landscape Engine
      // Target modern browsers for optimal performance
      target: 'es2020',
      // Preserve class names for state management system (important for polymorphic state)
      keepNames: true,
      // Charset handling for proper encoding
      charset: 'utf8',
      // Legal comments handling (remove in production)
      legalComments: 'none',
      // Log level for build output
      logLevel: 'warning',
      // Platform target
      platform: 'browser',
      // Source maps for development debugging
      sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false
    },
    // CSS configuration for development
    css: {
      devSourcemap: true,
      // Enable CSS source maps in development
      postcss: undefined,
      // PostCSS can be added here if needed
    }
  }
});

