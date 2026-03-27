# Brisbane Servers Monorepo

Monorepo containing the Brisbane Servers website and voice framework.

## Overview

This repository contains:
- **Voice Framework**: Comprehensive NLP framework for voice analysis and text generation
- **Website**: Astro-based website for Brisbane Servers
- **Dashboard**: Web-based UI for the voice framework

## Quick Start

### Installation

Install all dependencies:
```bash
npm run install:all
```

### Running the App

Start the unified app (website, portal, and API on one server):
```bash
npm start
```

- **App:** `http://localhost:3000`
- **Portal:** `http://localhost:3000/portal`

For the GitHub Pages hybrid split, run the static frontend and standalone API separately:
```bash
npm run start:hybrid
```

- **Static frontend:** `http://localhost:3000`
- **Standalone API:** `http://localhost:3002/api`

See [Run & troubleshoot](docs/operations/RUN_AND_TROUBLESHOOT.md) to run or fix issues. [GitHub Pages hybrid](docs/operations/GITHUB_PAGES_HYBRID.md) for deployment. [Credentials](docs/portal/CREDENTIALS.md) for login. [Portal](docs/portal/PORTAL.md) for portal features.

**Full documentation map:** [docs/README.md](docs/README.md) (start there if the repo feels large).

## Project structure

```
.
├── docs/                          # All human-written project docs (start: docs/README.md)
│   ├── operations/               # Runbooks, deploy, troubleshooting
│   ├── portal/                   # Portal behaviour and credentials
│   ├── project/                  # Architecture, status, contracts, checklists
│   ├── development/              # Env and tooling
│   ├── design/                   # Design system
│   └── archive/                  # Historical notes (incl. implementation write-ups)
├── voice-framework/              # Voice / NLP package and dashboard
│   ├── analyzers/
│   ├── generators/
│   ├── dashboard/
│   └── storage/
├── website-brisbaneservers.com/    # Astro site, portal UI, API routes
│   ├── src/
│   └── public/
├── scripts/
└── start-unified.ts              # Unified dev start (npm start)
```

## Documentation

- [Documentation hub](docs/README.md) — indexed list of every doc and where it lives
- [Codebase wire card](docs/project/CODEBASE_WIRE_CARD.md) — fast architecture map
- [Portal](docs/portal/PORTAL.md) — Admin portal and API overview
- [Credentials](docs/portal/CREDENTIALS.md) — Login and env credentials
- [Run & troubleshoot](docs/operations/RUN_AND_TROUBLESHOOT.md) — Start app and common issues
- [GitHub Pages hybrid](docs/operations/GITHUB_PAGES_HYBRID.md) — Static frontend + standalone API deployment
- [Repository status](docs/project/REPOSITORY_STATUS.md) — Status and overview
- [Environment variables](docs/development/ENV_VARIABLES.md) — Environment configuration
- [Hybrid API contract](docs/development/HYBRID_API_CONTRACT.md) — Shared frontend/backend route contract
- [Design tokens](docs/design/DESIGN_TOKENS_REFERENCE.md) — Design system tokens

### Voice Framework
- [Voice Framework README](voice-framework/README.md) - Framework overview
- [Quick Start](voice-framework/QUICK_START.md) - Quick start guide
- [API Mapping](voice-framework/API_MAPPING.md) - API endpoint mapping
- [Build Instructions](voice-framework/BUILD_INSTRUCTIONS.md) - Build system docs

### Website
- [Design Blocks System](website-brisbaneservers.com/DESIGN_BLOCKS_SYSTEM.md) - Design blocks documentation

## Development

### Building

**Voice Framework:**
```bash
cd voice-framework
npm run build
```

**Website:**
```bash
cd website-brisbaneservers.com
npm run build
```

### Testing

**Voice Framework:**
```bash
cd voice-framework
npm test
```

## Status

✅ **Production Ready** - All critical issues resolved

See [Repository status](docs/project/REPOSITORY_STATUS.md) for detailed status information.

## License

MIT

