*Archived. Superseded by [Portal](../portal/PORTAL.md) and [Run & troubleshoot](../operations/RUN_AND_TROUBLESHOOT.md).*

---

# ✅ Setup Complete - Voice Framework Integration & Admin Portal

## 🎉 What's Been Built

### 1. **Resource Generation API** ✅
- **Location**: `voice-framework/dashboard/routes/resource-routes.ts`
- **Endpoints**:
  - `POST /api/resources/generate` - Generate new resources using voice framework
  - `GET /api/resources` - List all resources (with filtering)
  - `GET /api/resources/:id` - Get specific resource
  - `PUT /api/resources/:id` - Update resource
  - `DELETE /api/resources/:id` - Delete resource
  - `POST /api/resources/:id/improve` - Improve resource content using voice framework

### 2. **Authentication System** ✅
- **Location**: `voice-framework/dashboard/middleware/auth.ts`
- **Features**:
  - Session-based authentication
  - Role-based access control (admin/editor/viewer)
  - Secure token management
  - Login/logout endpoints

### 3. **Admin Portal** ✅
- **Location**: `website-brisbaneservers.com/src/pages/portal.astro`
- **Features**:
  - Portal-style UI with modern design
  - Resource generation interface
  - Resource management dashboard
  - Search and filtering
  - Full CRUD operations
  - Accessibility compliant (ARIA labels, keyboard navigation)

### 4. **Integration** ✅
- Voice framework integrated into resource generation
- CORS configured for cross-origin requests
- Cookie parser added for session management
- All routes protected with authentication

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies for both projects
cd voice-framework && npm install
cd ../website-brisbaneservers.com && npm install
```

### Start Services

**Option 1: Unified Start (Recommended)**
```bash
# From project root
npm start
```

**Option 2: Manual Start**
```bash
# Terminal 1: Start Voice Framework API
cd voice-framework
npm run dashboard
# Runs on http://localhost:3001

# Terminal 2: Start Website
cd website-brisbaneservers.com
npm run dev
# Runs on http://localhost:3000
```

### Access Admin Portal

1. Navigate to: **http://localhost:3000/portal**
2. Login with:
   - **Email**: `admin@brisbaneservers.com`
   - **Password**: `admin123`

> ⚠️ **SECURITY WARNING**: These are DEFAULT credentials for development only!
> 
> **CRITICAL**: You MUST change these credentials before deploying to production!
> 
> Set the following environment variables in production:
> - `ADMIN_EMAIL` - Your production admin email
> - `ADMIN_PASSWORD` - A strong, secure password
> 
> **Never deploy with default credentials!** This is a security risk.

## 📋 Features

### Resource Generation
- Select industry and topic
- Customize content length and options
- Content automatically matches Brisbane Servers voice profile
- Voice validation and scoring
- Semantic compliance checking

### Resource Management
- View all resources in a dashboard
- Search by title, industry, or topic
- Filter by status (draft/published/archived)
- Edit resources inline
- Improve resources using voice framework
- Delete resources
- View resource metadata (word count, voice score, etc.)

### Authentication & Security
- Secure login/logout
- Session management
- Role-based access control
- Protected API endpoints
- CORS configured for localhost:3000

### Accessibility
- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- Semantic HTML structure

## 🔧 Configuration

### Environment Variables

**Voice Framework** (`voice-framework/.env`):
```env
PORT=3001
JWT_SECRET=your-secret-key-here
ADMIN_EMAIL=admin@brisbaneservers.com
ADMIN_PASSWORD=your-secure-password
ALLOWED_ORIGINS=http://localhost:3000
```

**Website** (`website-brisbaneservers.com/.env`):
```env
VOICE_API_URL=http://localhost:3001/api
```

## 📁 File Structure

```
.
├── voice-framework/
│   ├── dashboard/
│   │   ├── routes/
│   │   │   ├── resource-routes.ts    # Resource API endpoints
│   │   │   └── auth-routes.ts        # Authentication endpoints
│   │   ├── middleware/
│   │   │   └── auth.ts               # Auth middleware
│   │   └── server.ts                 # Main server (updated)
│   └── storage/
│       └── resources.json            # Generated resources (auto-created)
│
└── website-brisbaneservers.com/
    └── src/
        └── pages/
            └── admin.astro           # Admin portal UI
```

## 🧪 Testing

### Test Resource Generation
1. Login to admin portal
2. Fill in the "Generate New Resource" form:
   - Select an industry (e.g., "Technology")
   - Enter a topic (e.g., "Cloud Migration")
   - Click "Generate Resource"
3. Wait for generation (may take 30-60 seconds)
4. Resource will appear in the resources list

### Test Resource Management
1. View generated resources in the list
2. Use search to find specific resources
3. Filter by status (draft/published/archived)
4. Click "View" to see full resource content
5. Click "Improve" to regenerate with voice framework
6. Click "Edit" to modify resource details
7. Click "Delete" to remove a resource

## 🐛 Troubleshooting

### API Connection Issues
- Ensure voice framework is running on port 3001
- Check CORS configuration in `voice-framework/dashboard/middleware/security.ts`
- Verify `VOICE_API_URL` in admin portal matches your API URL

### Authentication Issues
- Clear browser localStorage: `localStorage.removeItem('authToken')`
- Check that cookie-parser is installed: `npm install cookie-parser`
- Verify environment variables are set correctly

### Resource Generation Fails
- Check voice framework logs for errors
- Ensure storage directory exists: `voice-framework/storage/`
- Verify voice profile is loaded in voice framework

### Build Errors
- Run `npm install` in both directories
- Check TypeScript compilation: `cd voice-framework && npx tsc --noEmit`
- Verify all dependencies are installed

## 📝 Next Steps

### Recommended Enhancements
1. **Database Integration**: Replace JSON file storage with a database (PostgreSQL/MongoDB)
2. **File Upload**: Add support for uploading voice samples via admin portal
3. **Batch Operations**: Add bulk resource generation
4. **Export/Import**: Add resource export/import functionality
5. **Analytics**: Add resource usage analytics
6. **Preview**: Add live preview of resources before publishing
7. **Versioning**: Add resource version history
8. **Collaboration**: Add multi-user collaboration features

### Production Checklist
- [ ] Change default admin credentials
- [ ] Set secure JWT_SECRET
- [ ] Configure production CORS origins
- [ ] Set up database instead of JSON files
- [ ] Add rate limiting for production
- [ ] Set up SSL/HTTPS
- [ ] Add logging and monitoring
- [ ] Set up backup system for resources
- [ ] Add email notifications for resource generation
- [ ] Implement proper error handling and user feedback

## 📚 Documentation

- **Integration Summary**: See `INTEGRATION_SUMMARY.md`
- **Admin Portal Guide**: See `ADMIN_PORTAL_README.md`
- **Voice Framework**: See `voice-framework/README.md`

## ✨ Summary

You now have a fully functional admin portal integrated with the voice framework for generating and managing resources. The system includes:

✅ Resource generation using voice framework  
✅ Authentication and authorization  
✅ Modern portal-style UI  
✅ Accessibility compliance  
✅ Full CRUD operations  
✅ Search and filtering  
✅ Voice validation and scoring  

Everything is ready to use! Start the services and navigate to `/admin` to begin generating resources.
