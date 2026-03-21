# Starter Blocks Implementation

## Overview

The portal supports a **starter blocks system** where selected resources act as read-only templates. Users create their own resources by copying these templates, building a reusable knowledge base.

## Features

### 1. Starter Blocks vs User Resources
- **Starter blocks**: Pre-built templates marked with `isStarterBlock: true`
- **User resources**: Copies created from starter blocks, owned by the creating user (`ownerId` set)
- **Hierarchy**: Super-admin > Admin > User (clients)

### 2. User Hierarchy & Visibility
- **Super-admin** (`@brisbaneservers.com`): Full access to all resources and starter blocks
- **Admin**: Sees starter blocks + their own resources
- **User**: Sees starter blocks + only their own resources

### 3. Recent Activity
- Shows only user resources (excludes starter blocks)
- Items are clickable and navigate to the resource
- Displays action type (Created/Updated) and metadata

### 4. Dashboard
- **Starter Blocks** section listing available templates
- **My Resources** preview showing the user’s own resources
- Stats count **only user resources** (exclude starter blocks)

### 5. Resource Management
- **Create from Starter Block**: Creates a user-owned copy
- **Type filter**: "My Resources" | "Starter Blocks" | "All"
- **Protection**: Starter blocks are read-only for non-super-admins
- **Ownership**: All new resources are assigned to the creating user

## API Endpoints

### GET /api/resources/starter-blocks
Returns only starter block resources.

### POST /api/resources/from-starter-block
Creates a new user resource based on a starter block template.

**Body:**
```json
{
  "starterBlockId": "resource-id",
  "industry": "optional-override",
  "topic": "optional-override",
  "customizations": {
    "title": "optional",
    "description": "optional",
    "content": "optional"
  }
}
```

## Resource Structure

Resources include:
```typescript
{
  id: string;
  industry: string;
  topic: string;
  title: string;
  description: string;
  content: string;
  generatedAt: string;
  generatedBy?: string;
  ownerId?: string;        // NEW: User who owns this resource
  version: number;
  status: 'draft' | 'published' | 'archived';
  isStarterBlock?: boolean;  // NEW: True if this is a template
  visibility?: 'public' | 'private' | 'starter';  // NEW
  metadata?: { ... }
}
```

## Scripts

### Mark Existing Resources as Starter Blocks
```bash
npm run mark:starter-blocks
```

This converts all existing resources to starter blocks, making them available as templates.

### Seed New Starter Blocks
```bash
npm run seed:resources
```

Creates new resources from industries/topics and marks them as starter blocks.

## Usage Flow

1. **User**
   - Logs in and sees starter blocks on the dashboard
   - Browses starter blocks and clicks **"Use This Block"**
   - A new resource is created with `ownerId` set to the user
   - The user edits and customizes their copy

2. **Admin**
   - Sees starter blocks + all user resources they own
   - Manages their own resources
   - Super-admins can additionally create new starter blocks

3. **Super-admin**
   - Sees all resources
   - Can edit/delete starter blocks
   - Manages all users’ resources

## Portal UI

### Dashboard
- Grid of available starter blocks with **"Use This Block"** buttons
- Recent activity shows only the user’s own resources
- Stats show only the user’s resources

### Resources Panel
- Type filter: "My Resources" | "Starter Blocks" | "All"
- Starter blocks use distinct styling (blue border, "STARTER BLOCK" badge)
- Starter blocks show **"Use This Block"** action instead of edit
- User resources show normal edit/delete actions

### Visual Indicators
- Starter blocks have a blue accent border and "STARTER BLOCK" badge
- Distinct hover states and styling to separate templates from user content

## Next Steps

1. Run `npm run mark:starter-blocks` to convert existing resources into starter blocks.
2. New users:
   - See starter blocks on the dashboard
   - Create their own resources from templates
   - Work with their own copies, separate from starter blocks
3. Admins and super-admins:
   - See all resources
   - Manage starter blocks (super-admin only)
   - See all users’ resources

## Benefits

- **Knowledge base**: Starter blocks serve as reusable templates
- **Onboarding**: New users start from curated examples instead of a blank slate
- **Customization**: Users adapt templates to their own needs
- **Separation**: Clear distinction between templates and user content
- **Scalability**: Easy to add and evolve starter blocks over time
