# Debug Quick Reference

## 🚀 Start Debugging

### 1. Start Server
```bash
cd voice-framework
npm run dashboard
```

### 2. Open Browser
- Navigate to: `http://localhost:3001`
- Open DevTools (F12)
- Go to Console tab

### 3. Run Debug Script
```javascript
// Debug script is auto-loaded, just run:
window.debugVoiceFramework();

// Or if you need to reload it:
fetch('/debug-script.js')
  .then(r => r.text())
  .then(eval)
  .then(() => window.debugVoiceFramework());
```

## 🔍 Quick Checks

### Check Server Status
```bash
# In terminal - should see:
🚀 Voice Framework Dashboard
   Server running on http://localhost:3001
```

### Check Browser Console
```javascript
// Should see:
[INIT] DOMContentLoaded - Starting initialization
[INIT] Initialization complete (XXXms)
```

### Check API Health
```javascript
// In browser console:
fetch('/api/health').then(r => r.json()).then(console.log)
// Should return: { status: 'ok', timestamp: '...' }
```

## 🐛 Common Debug Commands

### Test Analysis
```javascript
document.getElementById('unifiedAnalyzeInput').value = 'Test';
document.getElementById('unifiedAnalyzeBtn').click();
// Watch for [ANALYZE] logs
```

### Test Generation
```javascript
document.getElementById('unifiedGenerateInput').value = 'Topic';
document.getElementById('unifiedGenerateBtn').click();
// Watch for [GENERATE] logs
```

### Check All Elements
```javascript
// Count elements with IDs
document.querySelectorAll('[id]').length
// Should be 75+
```

### Check Functions
```javascript
// List all handler functions
['handleUnifiedAnalyze', 'handleUnifiedGenerate', 'loadRecentSamples']
  .map(f => ({ name: f, exists: typeof window[f] === 'function' }))
```

### Monitor API Calls
```javascript
// All API calls are logged with [API] prefix
// Watch console for:
// [API GET /api/health] Starting request
// [API POST /api/analyze] Success (XXXms)
```

## 📊 What to Look For

### ✅ Good Signs
- Server starts without errors
- Console shows `[INIT] Initialization complete`
- Status indicator shows "Ready"
- API calls return success
- No red errors in console

### ⚠️ Warning Signs
- Missing UI elements
- Functions not defined
- API calls failing
- Console errors
- Slow performance

### ❌ Critical Issues
- Server won't start
- Page won't load
- JavaScript errors on load
- API endpoints not responding
- Null reference errors

## 🔧 Quick Fixes

### Server Won't Start
```bash
# Check port
lsof -i :3001
# Kill process if needed
kill -9 <PID>
```

### Missing Elements
```javascript
// Check if element exists
document.getElementById('elementId') // Should not be null
```

### API Errors
```javascript
// Check API response
fetch('/api/health')
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(console.log)
  .catch(console.error);
```

## 📝 Log Patterns

### Successful Operation
```
[INIT] Initialization complete (50ms)
[API GET /api/health] Starting request
[API GET /api/health] Success (5ms) ✓
```

### Error Pattern
```
[API POST /api/analyze] Starting request
[API POST /api/analyze] HTTP 400 Bad Request (10ms)
[API POST /api/analyze] Error after 10ms: Text is required
```

## 🎯 Debugging Workflow

1. **Start** → Server + Browser
2. **Check** → Console for errors
3. **Test** → Basic functionality
4. **Monitor** → Logs for patterns
5. **Fix** → Issues found
6. **Verify** → Fixes work

## 🛡️ Error Handling Guide

### Consistent Error Handling Pattern

All error handling in the frontend uses a safe error extraction utility:

```javascript
/**
 * Safely extract error message from unknown error type
 * Handles Error objects, strings, and other types gracefully
 */
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}
```

### Using Error Handling in Catch Blocks

**✅ Correct Pattern:**
```javascript
try {
    const result = await apiCall('/api/endpoint', 'POST', data);
    // Handle success
} catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Operation failed:', errorMessage);
    // Display error to user
    displayError(errorMessage);
}
```

**❌ Incorrect Pattern (Don't Do This):**
```javascript
try {
    const result = await apiCall('/api/endpoint', 'POST', data);
} catch (error) {
    // ❌ BAD: Assumes error.message exists
    console.error('Error:', error.message);
    // This will crash if error is not an Error object!
}
```

### Why This Matters

JavaScript allows throwing any value, not just Error objects:
- `throw new Error('message')` ✅ Works
- `throw 'string error'` ✅ Works
- `throw { code: 500 }` ✅ Works
- `throw null` ✅ Works

Accessing `.message` on non-Error objects causes runtime errors. The `getErrorMessage()` function safely handles all cases.

### Error Handling Best Practices

1. **Always use `getErrorMessage()`** when extracting error messages
2. **Log the full error object** for debugging: `console.error('Error:', errorMessage, error)`
3. **Display user-friendly messages** - don't expose stack traces to users
4. **Handle different error types** appropriately (network errors vs validation errors)

### Example: Complete Error Handling

```javascript
async function handleOperation() {
    const statusDiv = document.getElementById('status');
    
    try {
        statusDiv.textContent = 'Processing...';
        const result = await apiCall('/api/endpoint', 'POST', data);
        
        if (result.success) {
            statusDiv.textContent = 'Success!';
            statusDiv.className = 'output-area success';
        } else {
            statusDiv.textContent = result.error || 'Operation failed';
            statusDiv.className = 'output-area error';
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Operation failed:', errorMessage, error);
        
        statusDiv.textContent = `Error: ${errorMessage}`;
        statusDiv.className = 'output-area error';
    } finally {
        // Cleanup code here
    }
}
```

## 📚 Reference Documents

- `DEBUG_START.md` - Full debugging guide
- `DEBUG_REPORT.md` - Known issues
- `UI_FUNCTION_HIERARCHY.md` - System flow
- `FUNCTION_MAPPING.md` - Function details
- `API_MAPPING.md` - API documentation

