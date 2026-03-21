# Build Instructions

## Quick Build

Run the PowerShell script:
```powershell
.\build-and-verify.ps1
```

Or run commands manually:

```powershell
cd voice-framework

# Standard build
npm run build

# Verify all files compiled
npm run verify
```

## Build Commands

### Standard Build
```bash
npm run build
```
Compiles all TypeScript files to JavaScript in the `dist/` folder.

### Force Rebuild
```bash
npm run build:force
```
Forces TypeScript to rebuild everything, ignoring cache.

### Clean Build
```bash
npm run build:clean
```
Removes `dist/` folder and rebuilds from scratch.

### Verify Build
```bash
npm run verify
```
Checks that all required files are compiled correctly.

### Dashboard Build
```bash
npm run build:dashboard
```
Builds dashboard static files without obfuscation (development mode).

### Dashboard Production Build
```bash
npm run build:dashboard:prod
```
Builds and obfuscates dashboard static files for production.

### Full Production Build
```bash
npm run build:production
```
Builds TypeScript code and obfuscates dashboard files.

**Note**: See [BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) for detailed dashboard build documentation.

## Build Fix History

### Issue: New Components Not Compiling
**Status**: ✅ RESOLVED

Previously, new components (Shredder, Storage, Profile Manager, Profile Builder) were not being compiled to the `dist/` folder.

**Solution Applied**:
- Updated build process to use TypeScript's standard compilation
- TypeScript's `include: ["**/*.ts"]` pattern automatically picks up all files
- Added `build:force` for forced rebuilds
- Added `verify` script to check build completeness

**Verification**:
After building, verify all files are compiled:
```bash
# Check for Shredder
Test-Path dist/analyzers/shredder.js

# Check for Storage
Test-Path dist/storage/text-storage.js
Test-Path dist/storage/profile-manager.js

# Check for Profile Builder
Test-Path dist/builders/profile-builder.js

# Check index includes new exports
Select-String -Path dist/index.js -Pattern "Shredder|TextStorage|ProfileManager|ProfileBuilder"
```

## Expected Output

After a successful build, you should see:

```
dist/
├── analyzers/
│   ├── shredder.js          ← NEW
│   ├── shredder.d.ts        ← NEW
│   ├── tone-analyzer.js
│   └── pattern-extractor.js
├── storage/
│   ├── text-storage.js      ← NEW
│   ├── text-storage.d.ts    ← NEW
│   ├── profile-manager.js   ← NEW
│   └── profile-manager.d.ts ← NEW
├── builders/
│   ├── profile-builder.js   ← NEW
│   └── profile-builder.d.ts ← NEW
├── generators/
│   ├── text-generator.js
│   ├── extrapolator.js
│   └── voice-matcher.js
├── models/
│   ├── voice-profile.js
│   └── text-patterns.js
└── index.js
```

## Troubleshooting

### Files Not Compiling

If new files aren't being compiled:

1. **Clean and rebuild**:
   ```bash
   npm run build:clean
   ```

2. **Force rebuild**:
   ```bash
   npm run build:force
   ```

3. **Check TypeScript errors**:
   ```bash
   npx tsc --noEmit
   ```

4. **Verify tsconfig.json** includes all files:
   - Should have `"include": ["**/*.ts"]`
   - Should exclude `node_modules` and `dist`

### Build Errors

If you see TypeScript errors:

1. Check for syntax errors in source files
2. Verify all imports are correct
3. Ensure all dependencies are installed: `npm install`
4. Check TypeScript version: `npx tsc --version`

## Dashboard Build System

The dashboard build system obfuscates JavaScript files for production deployment.

### Quick Start

**Development** (no obfuscation):
```bash
npm run build:dashboard
```

**Production** (with obfuscation):
```bash
npm run build:dashboard:prod
```

### Integration with Main Build

Build everything including dashboard obfuscation:
```bash
node build-all.js --obfuscate
```

Or set environment variable:
```bash
NODE_ENV=production node build-all.js
```

### Output

Dashboard builds output to `dashboard/public-build/` directory.

**Important**: Update your Express server to serve from `public-build/` in production.

For detailed documentation, see [BUILD_DASHBOARD.md](BUILD_DASHBOARD.md).

## Using the Framework

After building, you can use the framework:

```typescript
// Import from compiled output
import { createVoiceFramework, Shredder } from './dist/index.js';

// Or use TypeScript directly (no build needed)
import { createVoiceFramework } from './index';
```







