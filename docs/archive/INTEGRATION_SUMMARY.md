*Archived. Superseded by [Portal](../portal/PORTAL.md).*

---

# Voice Framework Integration & Admin Portal - Summary

## Overview

This document summarizes the integration of the voice framework into the Brisbane Servers website for dynamic resource generation, along with the creation of an admin portal for managing resources.

## What Was Built

### 1. Resource Generation API (`voice-framework/dashboard/routes/resource-routes.ts`)

A comprehensive REST API for managing resources that integrates with the voice framework:

- **POST `/api/resources/generate`** - Generate new resources using voice framework
- **GET `/api/resources`** - List all resources (with filtering)
- **GET `/api/resources/:id`** - Get specific resource
- **PUT `/api/resources/:id`** - Update resource
- **DELETE `/api/resources/:id`** - Delete resource
- **POST `/api/resources/:id/improve`** - Improve resource content using voice framework

**Features:**
- Uses `TextGenerator` to create initial content
- Uses `Extrapolator` to expand and enrich content
- Uses `VoiceMatcher` to validate voice consistency
- Stores resources in JSON file (`voice-framework/storage/resources.json`)
- Tracks metadata (word count, voice score, semantic level)

### 2. Authentication System (`voice-framework/dashboard/middleware/auth.ts`)

Simple session-based authentication:

- **POST `/api/auth/login`** - Login endpoint
- **POST `/api/auth/logout`** - Logout endpoint
- **GET `/api/auth/me`** - Get current user
- Middleware: `requireAuth`, `requireEditor`, `requireAdmin`

**Security:**
- Session tokens stored in memory (can be upgraded to Redis/DB)
- Default credentials: `admin@brisbaneservers.com` / `admin123`
- Configurable via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)

### 3. Admin Portal (`website-brisbaneservers.com/src/pages/portal.astro`)

A modern, portal-style admin interface for managing resources:

**Features:**
- Login screen with authentication
- Resource generation form with voice framework integration
- Resources list with search and filtering
- Resource management (view, edit, improve, delete)
- Portal-style UI with gradients and modern design
- Full accessibility support (ARIA labels, keyboard navigation, screen reader support)

**UI Highlights:**
- Gradient header with primary color scheme
- Card-based layout with hover effects
- Status badges (draft, published, archived)
- Responsive design
- Loading states and error handling

## Integration Points

### Voice Framework → Website

1. **API Communication**: Website admin portal calls voice framework API at `http://localhost:3001/api`
2. **Resource Generation**: Uses voice framework's `TextGenerator`, `Extrapolator`, and `VoiceMatcher`
3. **Content Storage**: Resources stored in JSON format, can be integrated into website pages

### Authentication Flow

1. User logs in via admin portal
2. Token stored in localStorage
3. All API requests include `Authorization: Bearer <token>` header
4. Token verified on each request
5. Session expires after 24 hours

## File Structure

```
voice-framework/
├── dashboard/
│   ├── middleware/
│   │   └── auth.ts                    # Authentication middleware
│   └── routes/
│       ├── auth-routes.ts             # Authentication endpoints
│       └── resource-routes.ts         # Resource management endpoints
│   └── storage/
│       └── resources.json             # Resource storage (auto-created)

website-brisbaneservers.com/
└── src/
    └── pages/
        └── admin.astro                # Admin portal page
```

## Usage

### Starting the Services

```bash
# Start both website and voice framework
npm start

# Or individually:
npm run start:website  # Website on http://localhost:3000
npm run start:voice   # Voice framework on http://localhost:3001
```

### Accessing Admin Portal

1. Navigate to `http://localhost:3000/portal`
2. Login with:
   - Email: `admin@brisbaneservers.com`
   - Password: `admin123`
3. Generate resources using the form
4. Manage resources in the list

### Generating a Resource

1. Select industry and enter topic
2. Optionally customize title, length, and examples
3. Click "Generate Resource"
4. Voice framework generates content matching Brisbane Servers voice profile
5. Resource appears in the list

### Improving a Resource

1. Click "Improve" on any resource
2. Voice framework extrapolates and enhances the content
3. Resource version increments
4. Voice score updated

## Next Steps

### Recommended Enhancements

1. **Resource Integration into Website**
   - Create dynamic route `/resources/[industry]/[topic]` that loads from API
   - Cache resources for performance
   - Add ISR (Incremental Static Regeneration) for static generation

2. **Enhanced Authentication**
   - Replace in-memory sessions with Redis or database
   - Add password hashing (bcrypt)
   - Implement refresh tokens
   - Add user management UI

3. **Resource Publishing**
   - Add "Publish" workflow
   - Integrate published resources into website pages
   - Add preview functionality
   - Version history

4. **UI Enhancements**
   - Add resource editor with rich text
   - Add preview pane
   - Add bulk operations
   - Add export functionality

5. **Performance**
   - Add caching layer
   - Add pagination for resources list
   - Add request queuing for generation

## Security Considerations

- ✅ Authentication required for all resource endpoints
- ✅ Editor/Admin roles enforced
- ✅ Input validation on all endpoints
- ⚠️ Default credentials should be changed in production
- ⚠️ Session storage should be moved to Redis/DB in production
- ⚠️ Add rate limiting for resource generation
- ⚠️ Add CSRF protection

## Accessibility Features

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation support
- ✅ Screen reader announcements
- ✅ Focus indicators
- ✅ Semantic HTML structure
- ✅ Error messages with proper roles

## Testing

To test the integration:

1. Start both services (`npm start`)
2. Navigate to `/admin`
3. Login
4. Generate a test resource
5. Verify it appears in the list
6. Test improve functionality
7. Test search and filtering
8. Test logout/login flow

## Environment Variables

Add to `.env` for production:

```env
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=secure-password-here
JWT_SECRET=your-secret-key-here
```

## Conclusion

The voice framework is now fully integrated into the website for resource generation. The admin portal provides a modern, accessible interface for managing resources with full voice framework integration. Resources can be generated, improved, and managed through the portal, with all content validated against the Brisbane Servers voice profile.
