# Build & Run Checklist

## Design / zoom policy
- [ ] Layout follows **native browser zoom** + **CSS media-query breakpoints** (no root `transform` for zoom, no JS zoom tier) — see [../docs/development/FEATURE_RECONCILIATION.md](../docs/development/FEATURE_RECONCILIATION.md)

## Pre-Build Validation
- [ ] TypeScript compilation passes
- [ ] Astro config is valid
- [ ] Required dependencies are present
- [ ] Viewport meta tags are present in layouts
- [ ] Essential CSS variables are defined

## Build targets

| Command | Use |
|--------|-----|
| `npm run build` | **GitHub Pages static frontend** (default `astro.config.mjs`) |
| `npm run build:cpanel` | **Node / cPanel** — see [../docs/operations/CPANEL_DEPLOY.md](../docs/operations/CPANEL_DEPLOY.md) |

## Build Process
- [ ] Build completes without errors
- [ ] All TypeScript files compile successfully
- [ ] CSS files are generated correctly
- [ ] If the standalone API is unavailable during build, public resource pages still render with fallback content

## Post-Build Verification
- [ ] dist directory exists
- [ ] index.html is generated
- [ ] All HTML files have viewport meta tags
- [ ] CSS files are present and have content
- [ ] No broken asset references

## Development Server
- [ ] Server starts successfully (`npm run dev` or `astro dev`)
- [ ] Localhost is accessible at **http://localhost:3000**
- [ ] No console errors
- [ ] Viewport enhancements work
- [ ] Responsive design functions correctly

## Functionality Tests
- [ ] Navigation works
- [ ] Components render correctly
- [ ] Viewport utilities function
- [ ] Symmetry system applies correctly
- [ ] CSS variables are accessible

## Production / SEO
- [ ] Set `PUBLIC_SITE_URL` on the deploy environment if the public origin is not `https://brisbaneservers.com` (canonical links, Open Graph, `/sitemap.xml`)
- [ ] Confirm `public/og-default.png` is present (default OG art — **South Bank / riverfront**). Optional nature alternate: `public/og-nature.png` (set `OG_DEFAULT_PATH` or per-page `ogImage`)
- [ ] Confirm `/sitemap.xml` returns XML and lists expected marketing URLs
- [ ] Confirm `/robots.txt` is served and references the correct `Sitemap:` URL for your host

