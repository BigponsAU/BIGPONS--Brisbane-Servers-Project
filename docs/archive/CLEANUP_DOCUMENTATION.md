# Cleanup Documentation

**Note**: This document is archived. For current repository status, see [Repository status](../project/REPOSITORY_STATUS.md).

## Files Removed (Redundant)

### 1. `voice-framework/start.bat`
- **Reason**: Replaced by unified cross-platform TypeScript script
- **Why redundant**: Just called `npm start` which calls `npm run dashboard`
- **Replacement**: `start-unified.ts` handles both services from root directory

### 2. `voice-framework/start.ps1`
- **Reason**: Replaced by unified cross-platform TypeScript script
- **Why redundant**: Just called `npm start` which calls `npm run dashboard`
- **Replacement**: `start-unified.ts` handles both services from root directory

### 3. `voice-framework/QUICK_FIX.md`
- **Reason**: Content covered in `QUICK_START.md`
- **Why redundant**: ENOENT error fix is already documented in QUICK_START.md
- **Overlap**: Both explain directory navigation and npm start commands

### 4. `voice-framework/README_START.md`
- **Reason**: Content covered in `QUICK_START.md`
- **Why redundant**: Same ENOENT fix content, same start instructions
- **Overlap**: Duplicates QUICK_START.md and QUICK_FIX.md content

## Files Assessed (Kept with Rationale)

### 1. `voice-framework/BUILD_FIX.md`
- **Status**: KEPT (with note)
- **Rationale**: Historical documentation of build fix. While BUILD_INSTRUCTIONS.md is more comprehensive, BUILD_FIX.md provides context about the specific issue that was resolved. However, it may become outdated if build system changes.
- **Recommendation**: Consider merging into BUILD_INSTRUCTIONS.md in future cleanup

### 2. `voice-framework/BUILD_INSTRUCTIONS.md`
- **Status**: KEPT
- **Rationale**: Comprehensive build instructions that complement package.json scripts. Provides detailed troubleshooting, expected output structure, and usage examples. Serves as valuable reference documentation.

### 3. `voice-framework/DASHBOARD_QUICKSTART.md`
- **Status**: KEPT (with note about port discrepancy)
- **Rationale**: User-focused quick start guide with tips and troubleshooting. While `dashboard/README.md` is more technical, DASHBOARD_QUICKSTART.md provides a better onboarding experience.
- **Note**: Contains outdated port information (mentions port 3000, but dashboard runs on 3001). Should be updated in future.

## Files Kept (Distinct Value)

### Build Scripts
- **`build-all.js`**: Cross-platform Node.js build script
- **`build-and-verify.ps1`**: Windows PowerShell build script (platform-specific value)
- **`verify-build.js`**: Cross-platform verification script
- **Rationale**: Serve different platforms and use cases

### Core Documentation
- **`README.md`**: Framework overview
- **`QUICK_START.md`**: Quick usage guide
- **`FRAMEWORK_SUMMARY.md`**: Complete framework overview
- **`VOICE_ANALYSIS.md`**: Detailed voice characteristics
- **`ENHANCED_FEATURES.md`**: Enhanced features documentation
- **`EXTENSIONS_SUMMARY.md`**: Extensions summary
- **`SHREDDER.md`**: Shredder documentation
- **`dashboard/README.md`**: Location-specific dashboard documentation
- **Rationale**: Each serves a distinct purpose and audience

## New Unified Start Script

### `start-unified.ts`
- **Location**: Root directory
- **Features**:
  - Port availability checking BEFORE starting (ports 3000, 3001)
  - Health verification AFTER starting (polls health endpoints)
  - Extrapolator integration for voice-consistent status messages
  - Graceful shutdown handling
  - Cross-platform support (Windows, macOS, Linux)

### Usage
```bash
npm start
# or
npm run start:unified
```

### Legacy Scripts
- `npm run start:legacy` - Original concurrently-based start (kept for backward compatibility)
- `npm run start:website` - Start website only
- `npm run start:voice` - Start dashboard only

## Summary

- **Files Removed**: 4 (start.bat, start.ps1, QUICK_FIX.md, README_START.md)
- **Files Assessed**: 3 (all kept with rationale)
- **New Files**: 1 (start-unified.ts)
- **Files Modified**: 1 (package.json)

The cleanup reduces redundancy while maintaining all valuable documentation and functionality. The unified start script provides a better developer experience with port checking, health verification, and voice-consistent messaging.

