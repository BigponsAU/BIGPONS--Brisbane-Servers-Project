# Base Profile Implementation

## Overview

The system supports creating a **base voice profile** from all starter resources. This base profile is the default voice used across the platform and acts as the foundation SMEs (Subject Matter Experts) build on when uploading their own content.

## Features

### 1. Base Profile Creation
- **From starter resources**: Aggregates all starter blocks to generate a comprehensive voice profile
- **Default profile**: Automatically set as the default profile on creation
- **Broad coverage**: Captures voice characteristics across industries and topics

### 2. Using and Extending the Base Profile
- **Automatic usage**: Document uploads automatically use the base profile
- **Content generation**: Text generation is guided by the base profile’s voice
- **Voice validation**: New content is checked against the base profile for consistency
- **Progressive enhancement**: Each new document refines the understanding while maintaining the base tone

## How It Works

### Creating the Base Profile

1. **Portal UI**
   - Go to the **"Voice Profiles"** panel
   - Click **"Create Base Profile from Starter Resources"**
   - The system processes all starter blocks and creates a unified profile

2. **API**
   ```bash
   POST /api/profiles/create-base
   Authorization: Bearer <token>
   ```

3. **Script**
   ```bash
   npm run create-base-profile
   ```

### Using the Base Profile

When SMEs upload documents or create resources:

1. **Document upload**: The system automatically uses the default (base) profile
2. **Text generation**: Generated content follows the base profile’s voice characteristics
3. **Voice matching**: Uploaded content is validated against the base profile
4. **Progressive building**: Each new document builds on the same underlying voice

## Technical Implementation

### API Endpoints

#### `POST /api/profiles/create-base`
Creates or updates the base profile from all starter resources.

**Response**:
```json
{
  "profile": {
    "id": "profile_...",
    "name": "Brisbane Servers Base Profile",
    "isDefault": true,
    ...
  },
  "success": true,
  "message": "Base profile created from 12 starter blocks",
  "starterBlocksCount": 12
}
```

### Code Changes

1. `scripts/create-base-profile.ts`: Standalone script to create/update the base profile
2. `website-brisbaneservers.com/src/pages/api/profiles/create-base.ts`: Base profile API endpoint
3. `website-brisbaneservers.com/src/pages/api/resources/upload.ts`: Uses the base profile during uploads
4. `voice-framework/dashboard/utils/document-utils.ts`: Auto-loads the default profile for document processing
5. `website-brisbaneservers.com/src/pages/portal.astro`: Adds the UI button and handler

### Profile Integration

- **TextGenerator**: Uses the base profile to influence generated text
- **VoiceMatcher**: Uses the base profile to validate content consistency
- **DocumentProcessor**: Automatically uses the default profile when processing documents
- **ProfileManager**: Treats the base profile as the default profile

## Usage Flow

### Administrators

1. Go to the **Voice Profiles** panel
2. Click **"Create Base Profile from Starter Resources"**
3. Wait for processing (combines all starter blocks)
4. Confirm the base profile is set as default

### SMEs (Subject Matter Experts)

1. **Upload document**
   - Upload through the portal
   - The system automatically uses the base profile
   - Generated/validated content follows the base voice

2. **Create resource**
   - Upload or create a new resource
   - The system blends SME content with base profile characteristics
   - Consistency with existing starter resources is maintained

## Benefits

1. **Consistency**: All content follows shared voice characteristics
2. **Strong foundation**: SMEs build on a curated base instead of starting from scratch
3. **Progressive enhancement**: Each new document adds nuance while preserving the core tone
4. **Automatic**: No manual profile selection required; the system applies the base profile
5. **Flexible**: The base profile can be regenerated as starter resources evolve

## Updating the Base Profile

To refresh the base profile after adding new starter resources:

1. Click **"Create Base Profile from Starter Resources"** again
2. The system updates the existing base profile in place
3. All future uploads and generations use the updated profile

## Notes

- The base profile is always the default profile
- Only one base profile exists at a time (new runs overwrite the previous one)
- Creating/updating the base profile requires editor/admin authentication
- Characteristics come from **all** starter blocks
- SMEs never need to manually select the profile
