# Resources Workspace & Profiles Page Fixes

## Issues Fixed

### 1. Profiles Page Showing Empty ✅

**Problem**  
Profiles page appeared empty even though profiles existed in `profiles.json`.

**Root Causes**
- API protected with `requireAdmin` instead of `requireEditor` (too restrictive)
- Frontend requested `${VOICE_API_URL}/profiles` (Express dashboard) instead of `/api/profiles` (Astro API route)

**Fixes**
1. Switched `requireAdmin` to `requireEditor` in `/api/profiles/index.ts` so editors and admins can access profiles
2. Updated frontend calls to use `/api/profiles` instead of `${VOICE_API_URL}/profiles`

### 2. Resources Workspace Not Showing ✅

**Problem**  
Resources workspace did not render correctly when navigating to the resources panel.

**Fixes**
1. **Workspace visibility**
   - Workspace (tree view) is now shown by default
   - List view is hidden by default
   - Workspace is initialized correctly when the panel loads

2. **Tree functionality**
   - `selectResource()` and `loadResourceDetail()` are wired and working
   - Tree items use `onclick="selectResource(...)"`
   - Tree search filter (`filterTree()`) works
   - Tree status filter (`filterTreeByStatus()`) works

3. **Variable scope**
   - Moved `currentResources` assignment before filtering
   - Ensures `userResources` is available where needed

## What Works Now

### Profiles Page
- Loads profiles from `/api/profiles`
- Shows all profiles from `profiles.json`
- Includes the default profile when present
- Uses helm layout for 2–12 profiles, grid layout for 13+
- Displays profile metadata (name, description, tags, default status)
- Profiles are clickable and open a detail view

### Resources Workspace
- Tree view shows resources grouped by industry → topic
- Clicking a tree item opens the detail panel
- Detail panel shows title, metadata, content, and actions
- Tree search filters by title
- Status filters (All, Published, Drafts, Archived) work
- Workspace is visible whenever the resources panel is open
- Empty state appears when no resource is selected
- Action buttons (View, Edit, Preview, Publish, etc.) work

## How to Test

### Profiles Page
1. Navigate to **"Voice Profiles"** panel
2. Confirm profiles load and render
3. Click a profile to see its details
4. Use **"Create Base Profile from Starter Resources"** to create a base profile

### Resources Workspace
1. Navigate to **"Resources"** panel
2. Confirm tree view appears on the left
3. Click resources in the tree to open details on the right
4. Use search to filter by title
5. Use status buttons to filter by status
6. Try **"View Full"**, **"Edit"**, **"Publish"**, etc.

## Files Modified

1. `website-brisbaneservers.com/src/pages/api/profiles/index.ts`
   - Replaced `requireAdmin` with `requireEditor`

2. `website-brisbaneservers.com/src/pages/portal.astro`
   - Fixed profiles API endpoint path
   - Ensured workspace visibility when navigating to resources
   - Fixed `userResources` scope
   - Removed duplicate `filterTreeByStatus` implementation

## Notes

- Profiles API now goes through the Astro route (`/api/profiles`) instead of the Express dashboard
- Workspace is fully functional with tree view + detail panel
- Tree interactions, selection, and detail rendering all behave as expected
