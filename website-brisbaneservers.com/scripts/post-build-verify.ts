#!/usr/bin/env node
/**
 * Post-Build Verification Script
 * Verifies that the build output is correct:
 * - All HTML files have proper viewport meta tags
 * - CSS files are generated correctly
 * - Assets are properly bundled
 * - No broken references
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname, extname, normalize } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distPath = join(projectRoot, 'dist');

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: VerificationResult[] = [];

/**
 * Recursively find all HTML files in a directory
 */
function findHTMLFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) {
    return fileList;
  }

  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      findHTMLFiles(filePath, fileList);
    } else if (extname(file) === '.html') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Check if dist directory exists
 */
function checkDistDirectory(): VerificationResult {
  if (!existsSync(distPath)) {
    return {
      name: 'Dist Directory',
      passed: false,
      message: 'dist directory not found. Run build first.'
    };
  }

  return {
    name: 'Dist Directory',
    passed: true,
    message: 'dist directory exists'
  };
}

/**
 * Verify all HTML files have viewport meta tags
 */
function checkHTMLViewportTags(): VerificationResult {
  try {
    const htmlFiles = findHTMLFiles(distPath);
    const serverEntryPath = join(distPath, 'server', 'entry.mjs');

    // Server mode: no prerendered HTML; viewport is in BaseLayout and applied at runtime
    if (htmlFiles.length === 0 && existsSync(serverEntryPath)) {
      return {
        name: 'HTML Viewport Tags',
        passed: true,
        message: 'Server build — viewport set in BaseLayout at runtime'
      };
    }

    if (htmlFiles.length === 0) {
      return {
        name: 'HTML Viewport Tags',
        passed: false,
        message: 'No HTML files found in dist directory'
      };
    }

    const filesWithoutViewport: string[] = [];
    
    for (const filePath of htmlFiles) {
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for viewport meta tag
      if (!content.includes('viewport') || !content.includes('meta name="viewport"')) {
        const relativePath = filePath.replace(distPath, '');
        filesWithoutViewport.push(relativePath);
      }
    }

    if (filesWithoutViewport.length > 0) {
      return {
        name: 'HTML Viewport Tags',
        passed: false,
        message: `HTML files missing viewport meta tag: ${filesWithoutViewport.slice(0, 3).join(', ')}${filesWithoutViewport.length > 3 ? '...' : ''}`
      };
    }

    return {
      name: 'HTML Viewport Tags',
      passed: true,
      message: `All ${htmlFiles.length} HTML files have viewport meta tags`
    };
  } catch (error: unknown) {
    return {
      name: 'HTML Viewport Tags',
      passed: false,
      message: `Error checking HTML files: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Built CSS must end with literal brand gradient on primary buttons (not flat blue only).
 */
function checkBrandChromaCSS(): VerificationResult {
  try {
    const assetsPath = join(distPath, 'assets');
    const clientAssetsPath = join(distPath, 'client', 'assets');
    const cssRoot = existsSync(assetsPath) ? assetsPath : clientAssetsPath;

    if (!existsSync(cssRoot)) {
      return {
        name: 'Brand chroma CSS',
        passed: false,
        message: 'assets directory not found — cannot verify brand gradients',
      };
    }

    const cssFiles = readdirSync(cssRoot).filter((file) => extname(file) === '.css');
    if (cssFiles.length === 0) {
      return {
        name: 'Brand chroma CSS',
        passed: false,
        message: 'No CSS bundle to verify',
      };
    }

    const bundle = cssFiles.map((file) => readFileSync(join(cssRoot, file), 'utf-8')).join('\n');
    const hasLiteralGradient =
      bundle.includes('#8b5cf6') &&
      bundle.includes('#ec4899') &&
      bundle.includes('brand-gradient-chroma');
    const hasMarketingPrimaryRule =
      bundle.includes('.btn.btn-primary') || bundle.includes('a.btn.btn-primary');
    const gradientOnMarketingButtons =
      hasLiteralGradient &&
      hasMarketingPrimaryRule &&
      bundle.includes('brand-gradient-chroma');

    if (!gradientOnMarketingButtons) {
      return {
        name: 'Brand chroma CSS',
        passed: false,
        message:
          'Primary button styles missing literal brand gradient (violet→pink). Re-check brand-chroma.css load order.',
      };
    }

    return {
      name: 'Brand chroma CSS',
      passed: true,
      message: 'Brand gradient chroma present in production CSS bundle',
    };
  } catch (error: unknown) {
    return {
      name: 'Brand chroma CSS',
      passed: false,
      message: `Error checking brand chroma: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check if CSS files are generated
 */
function checkCSSFiles(): VerificationResult {
  try {
    const assetsPath = join(distPath, 'assets');
    const clientAssetsPath = join(distPath, 'client', 'assets');
    const cssRoot = existsSync(assetsPath) ? assetsPath : clientAssetsPath;

    if (!existsSync(cssRoot)) {
      return {
        name: 'CSS Files',
        passed: false,
        message: 'assets directory not found in dist (expected dist/assets or dist/client/assets)'
      };
    }

    // Find CSS files
    const cssFiles: string[] = [];
    const files = readdirSync(cssRoot);
    
    for (const file of files) {
      if (extname(file) === '.css') {
        cssFiles.push(file);
      }
    }

    if (cssFiles.length === 0) {
      return {
        name: 'CSS Files',
        passed: false,
        message: 'No CSS files found in dist/assets'
      };
    }

    // Verify CSS files have content
    const emptyCSS: string[] = [];
    for (const file of cssFiles) {
      const filePath = join(cssRoot, file);
      const content = readFileSync(filePath, 'utf-8');
      if (content.trim().length === 0) {
        emptyCSS.push(file);
      }
    }

    if (emptyCSS.length > 0) {
      return {
        name: 'CSS Files',
        passed: false,
        message: `Empty CSS files found: ${emptyCSS.join(', ')}`
      };
    }

    return {
      name: 'CSS Files',
      passed: true,
      message: `Found ${cssFiles.length} CSS file(s) with content`
    };
  } catch (error: any) {
    return {
      name: 'CSS Files',
      passed: false,
      message: `Error checking CSS files: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Resolve a root-absolute URL path (e.g. /repo/assets/foo.js) to a file under dist.
 * GitHub project Pages emit a base prefix (/repo-name/); files on disk are under dist/assets/...
 */
function resolveAbsoluteAssetPath(urlPath: string): string {
  let rel = urlPath.replace(/^\/+/, '').replace(/\\/g, '/');
  while (rel) {
    const candidate = normalize(join(distPath, ...rel.split('/')));
    if (existsSync(candidate)) {
      return candidate;
    }
    const slash = rel.indexOf('/');
    if (slash === -1) {
      break;
    }
    rel = rel.slice(slash + 1);
  }
  return normalize(join(distPath, ...urlPath.replace(/^\/+/, '').split('/')));
}

/**
 * Check for broken asset references in HTML
 */
function checkAssetReferences(): VerificationResult {
  try {
    const htmlFiles = findHTMLFiles(distPath);

    if (htmlFiles.length === 0) {
      return {
        name: 'Asset References',
        passed: true,
        message: 'No HTML files to check'
      };
    }

    const brokenRefs: string[] = [];

    for (const filePath of htmlFiles) {
      const content = readFileSync(filePath, 'utf-8');

      // Find asset references (CSS, JS, images)
      const assetRegex = /(href|src)=["']([^"']*\.(css|js|png|jpg|jpeg|svg|webp|gif|ico))["']/gi;
      const matches = content.matchAll(assetRegex);

      for (const match of matches) {
        const assetPath = match[2];

        // Skip external URLs
        if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('//')) {
          continue;
        }

        let resolvedPath: string;
        if (assetPath.startsWith('/')) {
          resolvedPath = resolveAbsoluteAssetPath(assetPath);
        } else {
          const htmlDir = dirname(filePath);
          resolvedPath = normalize(join(htmlDir, assetPath));
        }

        if (!existsSync(resolvedPath)) {
          const relativePath = filePath.replace(distPath, '');
          brokenRefs.push(`${relativePath} -> ${assetPath}`);
        }
      }
    }

    if (brokenRefs.length > 0) {
      return {
        name: 'Asset References',
        passed: false,
        message: `Broken asset references found: ${brokenRefs.slice(0, 3).join('; ')}${brokenRefs.length > 3 ? '...' : ''}`
      };
    }

    return {
      name: 'Asset References',
      passed: true,
      message: 'All asset references are valid'
    };
  } catch (error: any) {
    return {
      name: 'Asset References',
      passed: false,
      message: `Error checking asset references: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if index.html exists (or server build is present)
 * In server/SSR mode (output: "server"), dist has no index.html — pages are rendered on demand.
 */
function checkIndexHTML(): VerificationResult {
  const indexPath = join(distPath, 'index.html');
  const serverEntry = join(distPath, 'server', 'entry.mjs');

  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, 'utf-8');
    if (content.trim().length === 0) {
      return { name: 'Index HTML', passed: false, message: 'index.html is empty' };
    }
    return { name: 'Index HTML', passed: true, message: 'index.html exists and has content' };
  }

  // Server mode: no index.html; pass if a generic server entry exists
  if (existsSync(serverEntry)) {
    return { name: 'Index HTML', passed: true, message: 'Server build (no static index.html)' };
  }

  return {
    name: 'Index HTML',
    passed: false,
    message: 'index.html not found and no server entry in dist'
  };
}

/**
 * Cloudflare Rocket Loader breaks Astro module bundles unless opted out.
 * Astro strips `data-cfasync` from source `<script>` tags (breaks bundling), so patch output HTML.
 */
function patchModuleScriptsForRocketLoader(): VerificationResult {
  try {
    const htmlFiles = findHTMLFiles(distPath);
    let patchedFiles = 0;
    let patchedScripts = 0;

    for (const filePath of htmlFiles) {
      const original = readFileSync(filePath, 'utf-8');
      let content = original;
      let filePatches = 0;

      content = content.replace(/<script(?![^>]*\bdata-cfasync=)([^>]*\btype="module"[^>]*)>/g, (match) => {
        filePatches += 1;
        return match.replace('<script', '<script data-cfasync="false"');
      });

      if (content !== original) {
        writeFileSync(filePath, content, 'utf-8');
        patchedFiles += 1;
        patchedScripts += filePatches;
      }
    }

    return {
      name: 'Rocket Loader module opt-out',
      passed: true,
      message:
        patchedScripts > 0
          ? `Added data-cfasync="false" to ${patchedScripts} module script(s) in ${patchedFiles} HTML file(s)`
          : 'No module scripts needed Rocket Loader opt-out',
    };
  } catch (error) {
    return {
      name: 'Rocket Loader module opt-out',
      passed: false,
      message: `Failed to patch module scripts: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Fail build if Astro emitted unbundled TypeScript imports (sign-in POST 405 regression).
 */
function checkBundledClientScripts(): VerificationResult {
  try {
    const htmlFiles = findHTMLFiles(distPath);
    const offenders: string[] = [];

    for (const filePath of htmlFiles) {
      const content = readFileSync(filePath, 'utf-8');
      if (/import\s+[^;]+from\s+['"][^'"]+\.ts['"]/.test(content)) {
        offenders.push(filePath.replace(distPath, 'dist'));
      }
    }

    if (offenders.length > 0) {
      return {
        name: 'Bundled Client Scripts',
        passed: false,
        message: `Unbundled .ts imports in: ${offenders.slice(0, 5).join(', ')}${offenders.length > 5 ? '…' : ''}`,
      };
    }

    const assetsDir = join(distPath, 'assets');
    if (!existsSync(assetsDir)) {
      return {
        name: 'Bundled Client Scripts',
        passed: false,
        message: 'dist/assets not found',
      };
    }

    const jsAssets = readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
    const hasMarketingShell = jsAssets.some(
      (name) => name.includes('SiteShell') && !name.includes('AccountSiteShell'),
    );
    const hasAccountShell = jsAssets.some((name) => name.includes('AccountSiteShell'));
    const hasAccount = jsAssets.some((name) => name.includes('account-auth') || name.includes('AccountWorkspacePage'));
    const hasDashboardApp = jsAssets.some((name) => name.includes('account-workspace-app'));
    const hasDashboardProfiles = jsAssets.some((name) => name.includes('account-workspace-profiles'));
    const hasDashboardResources = jsAssets.some((name) => name.includes('account-workspace-resources'));

    if (!hasMarketingShell) {
      return {
        name: 'Bundled Client Scripts',
        passed: false,
        message: 'Missing SiteShell client bundle (main.ts) in dist/assets',
      };
    }

    if (!hasAccountShell) {
      return {
        name: 'Bundled Client Scripts',
        passed: false,
        message: 'Missing AccountSiteShell client bundle (account-nav.ts) in dist/assets',
      };
    }

    const missingChunks: string[] = [];
    if (!hasDashboardApp) missingChunks.push('account-workspace-app');
    if (!hasDashboardProfiles) missingChunks.push('account-workspace-profiles');
    if (!hasDashboardResources) missingChunks.push('account-workspace-resources');

    if (missingChunks.length > 0) {
      return {
        name: 'Bundled Client Scripts',
        passed: false,
        message: `Missing dashboard lazy chunks in dist/assets: ${missingChunks.join(', ')}`,
      };
    }

    return {
      name: 'Bundled Client Scripts',
      passed: true,
      message: hasAccount
        ? `Client bundles present (${jsAssets.length} JS assets; auth + lazy dashboard split)`
        : `Client bundles present (${jsAssets.length} JS assets; lazy dashboard split)`,
    };
  } catch (error) {
    return {
      name: 'Bundled Client Scripts',
      passed: false,
      message: `Could not verify client bundles: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Marketing pages must load main.ts (search); account must load account-nav only.
 * Guards against Astro conditional-script index inversion (search silent failure).
 */
function checkClientBundlePageMapping(): VerificationResult {
  try {
    const marketingPages = [
      join(distPath, 'index.html'),
      join(distPath, 'resources', 'index.html'),
    ];
    const accountPage = join(distPath, 'account', 'index.html');
    const assetsDir = join(distPath, 'assets');

    const readBundleForHtml = (htmlPath: string): { scriptName: string; content: string } | null => {
      if (!existsSync(htmlPath)) return null;
      const html = readFileSync(htmlPath, 'utf-8');
      const match = html.match(/\/assets\/([^"']+\.js)/);
      if (!match) return null;
      const scriptName = match[1];
      const scriptPath = join(assetsDir, scriptName);
      if (!existsSync(scriptPath)) return null;
      return { scriptName, content: readFileSync(scriptPath, 'utf-8') };
    };

    const marketingMissingSearch: string[] = [];
    for (const pagePath of marketingPages) {
      const bundle = readBundleForHtml(pagePath);
      if (!bundle) {
        marketingMissingSearch.push(`${pagePath.replace(distPath, 'dist')}: no client bundle`);
        continue;
      }
      if (!bundle.content.includes('search-results')) {
        marketingMissingSearch.push(
          `${pagePath.replace(distPath, 'dist')}: ${bundle.scriptName} missing search`,
        );
      }
    }

    if (marketingMissingSearch.length > 0) {
      return {
        name: 'Client bundle page mapping',
        passed: false,
        message: marketingMissingSearch.join('; '),
      };
    }

    const accountBundle = readBundleForHtml(accountPage);
    if (!accountBundle) {
      return {
        name: 'Client bundle page mapping',
        passed: false,
        message: 'account/index.html has no client bundle',
      };
    }

    if (accountBundle.content.includes('search-results')) {
      return {
        name: 'Client bundle page mapping',
        passed: false,
        message: `account loads marketing bundle (${accountBundle.scriptName})`,
      };
    }

    return {
      name: 'Client bundle page mapping',
      passed: true,
      message: 'Marketing pages load main.ts; account loads account-nav.ts',
    };
  } catch (error) {
    return {
      name: 'Client bundle page mapping',
      passed: false,
      message: `Could not verify bundle mapping: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Run all verification checks
 */
function runVerification(): void {
  console.log('🔍 Running post-build verification...\n');

  results.push(checkDistDirectory());
  results.push(patchModuleScriptsForRocketLoader());
  results.push(checkIndexHTML());
  results.push(checkHTMLViewportTags());
  results.push(checkCSSFiles());
  results.push(checkBrandChromaCSS());
  results.push(checkBundledClientScripts());
  results.push(checkClientBundlePageMapping());
  results.push(checkAssetReferences());

  // Print results
  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${icon} [${status}] ${result.name}`);
    console.log(`   ${result.message}\n`);
    
    if (!result.passed) {
      allPassed = false;
    }
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log('📊 Summary:');
  console.log(`   Passed: ${passedCount}/${totalCount}`);
  console.log(`   Failed: ${totalCount - passedCount}/${totalCount}\n`);

  if (allPassed) {
    console.log('✅ All post-build verifications passed!');
    process.exit(0);
  } else {
    console.log('❌ Some post-build verifications failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run verification
runVerification();



