# Voice Framework Dashboard

Interactive web dashboard for the Voice Framework. Provides a user-friendly interface for text generation, analysis, extrapolation, voice matching, and A/B testing.

## Features

- **Text Generation**: Generate text matching the voice profile
- **Text Analysis**: Analyze text for tone, vocabulary, and structure
- **Extrapolation**: Expand and extrapolate on existing text
- **Voice Matching**: Check how well text matches the voice profile
- **A/B Testing**: Run test suites and compare variants
- **Test Results**: View and compare test results

## Running the Dashboard

### Prerequisites

Install dependencies:
```bash
npm install
```

### Start the Server

```bash
npm run dashboard
```

Or:
```bash
npm start
```

The dashboard will be available at: **http://localhost:3001**

## Usage

1. Open your browser and navigate to `http://localhost:3001`
2. Use the sidebar to navigate between different sections
3. Enter text or parameters in the forms
4. Click the action buttons to run operations
5. View results in the output areas

## API Endpoints

The dashboard server exposes the following API endpoints:

### Health & Status
- `GET /api/health` - Health check endpoint

### Analysis Endpoints
- `POST /api/analyze` - Analyze text tone and voice match
- `POST /api/extract-patterns` - Extract patterns from text
- `POST /api/shred` - Extract objective truths from text
- `POST /api/compare-truths` - Compare truths from multiple sources

### Generation Endpoints
- `POST /api/generate` - Generate text matching voice profile
- `POST /api/extrapolate` - Extrapolate/expand existing text
- `POST /api/extrapolate-project` - Extrapolate entire project directory
- `POST /api/match-voice` - Match text against voice profile

### Testing Endpoints
- `POST /api/run-tests` - Run A/B test suite
- `GET /api/test-results/:testId?` - Get test results (placeholder)

### Storage Endpoints
- `GET /api/storage/samples` - Get all text samples (with optional filters)
- `POST /api/storage/samples` - Add a text sample
- `POST /api/storage/cleanup` - Cleanup binary data from storage
- `GET /api/storage/principles` - Get all principles (with optional filters)
- `POST /api/storage/principles` - Add a principle

### Profile Endpoints
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles` - Create a new profile
- `GET /api/profiles/default` - Get default profile

### Profile Builder Endpoints
- `POST /api/profile-builder/build` - Build profile from samples

### Document Processing Endpoints
- `POST /api/documents/upload` - Upload and process a single file
- `POST /api/documents/upload-folder` - Upload and process multiple files
- `POST /api/documents/process` - Process pasted content

### Topology Endpoints
- `GET /api/topology/principles` - Get principles for 3D visualization
- `GET /api/topology/profiles` - Get profiles for topology view

## Configuration

You can configure the server port by setting the `PORT` environment variable:

```bash
PORT=4000 npm run dashboard
```

## Development

The dashboard consists of:

- `server.ts` - Express server with API endpoints
- `public/index.html` - Dashboard HTML
- `public/styles.css` - Dashboard styles (uses design system tokens)
- `public/design-tokens.css` - Shared design tokens from main design system
- `public/app.js` - Dashboard JavaScript

To modify the dashboard, edit the files in the `dashboard/` directory and restart the server.

## Design System Integration

The dashboard uses the same design token system as the main website, ensuring visual consistency across both UIs. All spacing, colors, typography, and transitions follow the Sierpinski pattern where tokens reference tokens.

### Token Usage

The dashboard imports design tokens from `design-tokens.css` which maps to the main website's design system:

- **Spacing**: Uses `--space-xs` through `--space-6xl` tokens
- **Colors**: Uses `--primary-color`, `--bg-primary`, `--text-primary`, etc.
- **Typography**: Uses `--text-sm`, `--text-base`, `--text-lg`, etc.
- **Transitions**: Uses `--transition`, `--transition-fast` (phi-timed)
- **Shadows**: Uses `--shadow-sm`, `--shadow-md`, `--shadow-lg`, etc.

### Example

```css
/* Dashboard component using design tokens */
.dashboard-card {
  padding: var(--space-xl);
  background: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.dashboard-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(calc(var(--space-xs) * -1));
}
```

### Visual Consistency

The dashboard maintains visual consistency with the website through:
- Same color palette (primary blue, dark backgrounds)
- Same spacing scale (phi-based)
- Same typography scale (phi-based)
- Same transition timing (phi-timed: 0.618s)
- Same border radius and shadow system

This ensures a cohesive experience when switching between the website and dashboard.


