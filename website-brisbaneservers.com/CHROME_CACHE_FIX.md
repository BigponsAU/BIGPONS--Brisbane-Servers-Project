# Chrome Cache Fix Guide

If the portal page isn't responding in Chrome but works in other browsers, Chrome is likely caching old JavaScript/CSS files.

## Quick Fixes (Try in order):

### 1. Hard Refresh (Easiest)
- **Windows/Linux**: Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: Press `Cmd + Shift + R`
- This forces Chrome to reload all files from the server

### 2. Clear Cache for This Site
1. Open Chrome DevTools (`F12`)
2. Right-click the refresh button (while DevTools is open)
3. Select "Empty Cache and Hard Reload"

### 3. Clear Site Data
1. Click the lock icon in the address bar
2. Click "Site settings"
3. Click "Clear data"
4. Refresh the page

### 4. Disable Cache (For Development)
1. Open Chrome DevTools (`F12`)
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open while testing
5. Refresh the page

### 5. Clear All Browser Data (Nuclear Option)
1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"
5. Restart Chrome

## What Was Fixed:

1. **Immediate Cleanup Script**: Added inline script in `<head>` that runs before any cached scripts
2. **Cache-Busting Meta Tags**: Added HTTP headers to prevent aggressive caching
3. **Multiple Cleanup Points**: Cleanup runs at:
   - Page load (immediate)
   - DOMContentLoaded
   - Window load
   - ESC key press

## If Still Not Working:

1. Check Chrome Console (`F12` → Console tab) for JavaScript errors
2. Check Network tab to see if files are loading from cache (status 304) vs server (200)
3. Try Incognito mode (`Ctrl + Shift + N`) - this bypasses cache
4. Check if Chrome extensions are interfering (try disabling extensions)

## Technical Details:

The fix includes:
- Inline cleanup script in `<head>` that executes immediately
- Cache-control meta tags: `no-cache, no-store, must-revalidate`
- Multiple cleanup event listeners as fallbacks
- Aggressive modal/overlay cleanup on page load
