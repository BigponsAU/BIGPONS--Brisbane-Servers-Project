# How to Run and Test Upload Functionality

## Quick Start

### 1. Start the Application

From the **project root** directory (`c:\Users\munch\Desktop\O1`):

```powershell
npm start
```

This will automatically start both servers:
- ✅ **Website**: `http://localhost:3000`
- ✅ **Voice Framework API**: `http://localhost:3001`

**Expected Output:**
```
============================================================
Starting services with comprehensive integration...
============================================================

🔍 Verifying port availability...
✅ Port 3000 available (website)
✅ Port 3001 available (dashboard)

🚀 Starting services...
   Website: http://localhost:3000
   Dashboard: http://localhost:3001

⏳ Waiting for services to initialize...
   Checking website (3000) ✅
   Checking dashboard (3001) ✅

============================================================
✅ All services are running and healthy!
============================================================

📱 Website:    http://localhost:3000
📊 Dashboard:  http://localhost:3001

Press Ctrl+C to stop all services
```

### 2. Access the Portal

1. Open your browser and navigate to: **http://localhost:3000/portal**

2. **Login** with default credentials:
   - **Email**: `admin@brisbaneservers.com`
   - **Password**: `admin123`

### 3. Test Upload Functionality

#### Step-by-Step Upload Test:

1. **Navigate to Upload Section**
   - After logging in, look for the "Upload Resource" section
   - It should be visible in the portal interface

2. **Fill Out the Upload Form**
   - **Upload File**: Click "Choose File" and select a text file (.txt, .md, .html, .htm, .doc, .docx)
   - **Industry**: Select an industry from the dropdown (e.g., "Professional Services")
   - **Topic**: Enter a topic name (e.g., "Client Management Systems")
   - **Title** (optional): Leave blank to auto-generate from filename
   - **Process through voice framework**: Checked (default)
   - **Auto-publish**: Unchecked (default)

3. **Submit the Upload**
   - Click the "Upload & Process Resource" button
   - You should see a status message: "Uploading and processing resource..."
   - The button should change to "Uploading..." and be disabled

4. **Verify Success**
   - ✅ **Success**: You should see a green notification: "Resource uploaded successfully! Voice Score: XX%"
   - ✅ **Status message**: Should show success message
   - ✅ **Form reset**: Form should clear after successful upload
   - ✅ **Resources list**: Should refresh automatically after upload

5. **Check Browser Console** (F12)
   - In **development mode**, you should see: `[Portal] Refreshing resources after upload`
   - **No errors** should appear in the console
   - Check the Network tab to verify the API call succeeded

## Verification Checklist

### ✅ Server Health Checks

1. **Check Voice Framework API Health:**
   ```
   Open: http://localhost:3001/api/health
   Expected: {"status":"healthy",...}
   ```

2. **Check Portal Access:**
   ```
   Open: http://localhost:3000/portal
   Expected: Login screen (no connection errors)
   ```

### ✅ Upload Functionality Tests

#### Test 1: Basic Upload
- [ ] Select a text file (.txt or .md)
- [ ] Choose an industry from dropdown
- [ ] Enter a topic name
- [ ] Click "Upload & Process Resource"
- [ ] Verify success notification appears
- [ ] Verify form resets after upload
- [ ] Verify resource appears in resources list

#### Test 2: Upload with Auto-Publish
- [ ] Fill out form as above
- [ ] Check "Auto-publish after processing"
- [ ] Upload file
- [ ] Verify resource is published (check status in resources list)

#### Test 3: Error Handling
- [ ] Try uploading without selecting a file
- [ ] Verify error message: "Please select a file to upload."
- [ ] Try uploading without selecting industry
- [ ] Verify error message: "Industry and topic are required"
- [ ] Try uploading a file larger than 10MB
- [ ] Verify error message: "File size exceeds 10MB limit."

#### Test 4: Duplicate Prevention
- [ ] Upload a resource with same industry + topic
- [ ] Upload again with same industry + topic
- [ ] Verify message: "Resource updated (duplicate prevented)"
- [ ] Verify version number increments

### ✅ Debug Verification

1. **Check Console Logs** (F12 → Console tab)
   - In **development mode**: Should see initialization logs
   - In **production mode**: Should NOT see console.log statements
   - Errors should always be logged (console.error)

2. **Check Network Tab** (F12 → Network tab)
   - Filter by "XHR" or "Fetch"
   - Upload should make POST request to `/api/resources/upload`
   - Status should be `200 OK`
   - Response should contain `success: true`

3. **Check Server Logs**
   - In the terminal running `npm start`
   - Should see API request logs
   - In development: Should see `[API] POST /api/resources/upload - Success`
   - In production: Should NOT see console.log statements

## Troubleshooting

### Port Already in Use

If you see "Port 3000/3001 is already in use":

```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

### Connection Error

If you see "Connection error" when accessing the portal:

1. **Verify both servers are running:**
   - Check terminal output for both services
   - Verify `http://localhost:3001/api/health` returns healthy status

2. **Check browser console** (F12) for detailed errors

3. **Verify CORS settings** - Make sure `ALLOWED_ORIGINS` includes `http://localhost:3000`

### Upload Fails

If upload fails:

1. **Check browser console** (F12) for error messages
2. **Check Network tab** to see the API response
3. **Check server logs** in the terminal
4. **Verify authentication** - Make sure you're logged in
5. **Check file format** - Only text files are supported (.txt, .md, .html, .htm, .doc, .docx)

### Form Not Submitting

If clicking "Upload & Process Resource" does nothing:

1. **Open browser console** (F12)
2. **Check for JavaScript errors**
3. **Verify form elements exist:**
   ```javascript
   // Run in browser console
   document.getElementById('upload-resource-form')
   document.getElementById('upload-file')
   document.getElementById('upload-industry')
   document.getElementById('upload-topic')
   ```

## Manual Testing Commands

### Test API Endpoint Directly

```powershell
# Get auth token first (login)
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body (@{
    email = "admin@brisbaneservers.com"
    password = "admin123"
} | ConvertTo-Json) -ContentType "application/json"

$token = $response.token

# Test upload endpoint (replace with actual file path)
$filePath = "C:\path\to\your\test.txt"
$formData = @{
    file = Get-Item $filePath
    industry = "professional-services"
    topic = "test-topic"
    autoProcess = "true"
    autoPublish = "false"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/resources/upload" -Method POST -Headers @{
    Authorization = "Bearer $token"
} -Form $formData
```

## Expected Behavior

### ✅ Success Flow:
1. User fills out form and clicks submit
2. Form validates inputs (file, industry, topic required)
3. File is uploaded to server
4. Server processes file (if autoProcess is enabled)
5. Resource is saved to `voice-framework/storage/resources.json`
6. Success notification appears
7. Form resets
8. Resources list refreshes automatically

### ✅ Error Flow:
1. User submits form with missing/invalid data
2. Client-side validation shows error message
3. Error notification appears
4. Form remains filled (user can correct and resubmit)
5. Submit button re-enables

## Files to Check After Upload

After a successful upload, verify the resource was saved:

```powershell
# Check resources.json file
Get-Content "voice-framework\storage\resources.json" | ConvertFrom-Json | Select-Object -Last 1
```

You should see the newly uploaded resource with:
- `id`: Generated ID
- `industry`: Selected industry
- `topic`: Entered topic (normalized to slug)
- `title`: File name or custom title
- `content`: File content (processed if autoProcess was enabled)
- `status`: "draft" or "published" (depending on autoPublish)
- `generatedAt`: Current timestamp
- `metadata`: Word count, semantic level, voice score

## Next Steps

After verifying upload works:

1. ✅ Test with different file types (.txt, .md, .html)
2. ✅ Test with different industries and topics
3. ✅ Test duplicate prevention
4. ✅ Test error scenarios
5. ✅ Verify resources appear in the resources list
6. ✅ Test editing/deleting uploaded resources
