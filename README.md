# TGDD - E-Commerce Platform with Voice Commerce

<div align="center">

[![Monorepo](https://img.shields.io/badge/monorepo-bun-fff.svg?logo=bun)](https://bun.sh)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev)
[![API](https://img.shields.io/badge/API-Hono%204-FF6B35?logo=hono)](https://hono.dev)
[![AI](https://img.shields.io/badge/AI-Cloudflare%20Workers%20AI-F38020?logo=cloudflare)](https://developers.cloudflare.com/workers-ai/)
[![Auth](https://img.shields.io/badge/Auth-Better--Auth-FF6B35)](https://www.better-auth.com)
[![Database](https://img.shields.io/badge/Database-Drizzle%20ORM-3D2475?logo=drizzle)](https://orm.drizzle.team)
[![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Pages%20%2B%20Workers-FFA500?logo=cloudflare)](https://pages.cloudflare.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)

A modern e-commerce platform with AI-powered voice commerce capabilities, built on Cloudflare's edge computing infrastructure.

</div>

## Overview

TGDD is a full-stack e-commerce platform featuring:

- **Web Frontend** - Modern React 19 application with TanStack Router
- **REST API** - Edge-deployed API Worker with Hono
- **AI Agent** - Voice commerce powered by Cloudflare Workers AI
- **Authentication** - Secure auth with Better Auth
- **Database** - Drizzle ORM with SQLite

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                             │
├─────────────────┬───────────────────┬───────────────────────┤
│    Pages        │   AI Worker       │    API Worker         │
│  (Frontend)     │  (AI Agent)       │   (REST API)          │
│                 │                   │                       │
│  • React 19     │  • Vercel AI SDK  │   • Hono             │
│  • Vite         │  • MCP SDK        │   • Better Auth       │
│  • Tailwind     │  • Cloudflare AI  │   • Drizzle ORM       │
└────────┬────────┴────────┬───────────┴───────────┬───────────┘
         │                │                       │
         └────────────────┴───────────────────────┘
                              │
                    Cloudflare D1 / KV
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Node.js](https://nodejs.org) >= 18
- [Cloudflare Account](https://dash.cloudflare.com)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tgdd

# Install dependencies
bun install
```

### Development

```bash
# Run all apps in development mode
bun run dev:web      # Frontend at http://localhost:5173
bun run dev:api      # API Worker at http://localhost:8787
bun run dev:ai       # AI Worker

# Or run web with backend
cd apps/web && bun run app
```

### Build

```bash
# Build web frontend
bun run build:web

# Deploy individual apps
bun run deploy:web   # Deploy to Cloudflare Pages
bun run deploy:ai    # Deploy AI Worker
bun run deploy:api   # Deploy API Worker

# Deploy all at once
bun run deploy:all
```

## Project Structure

```
tgdd/
├── apps/
│   ├── web/           # React frontend (Cloudflare Pages)
│   │   ├── src/       # React components & pages
│   │   ├── functions/ # Cloudflare Pages Functions
│   │   └── dist/      # Built output
│   │
│   ├── api-worker/    # REST API (Cloudflare Worker)
│   │   └── src/
│   │       ├── index.ts      # Worker entry
│   │       ├── routes/       # API routes
│   │       ├── auth/         # Authentication
│   │       └── db/           # Database models
│   │
│   └── ai-worker/     # AI Agent (Cloudflare Worker)
│       └── src/
│           ├── index.ts      # Worker entry
│           ├── agent.ts      # AI agent logic
│           └── mcp/          # MCP tools
│
└── packages/          # Shared packages (if any)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, TanStack Router, Tailwind CSS |
| API | Hono, Better Auth, Zod |
| Database | Drizzle ORM, Cloudflare D1 |
| AI | Cloudflare Workers AI, Vercel AI SDK, MCP |
| Edge | Cloudflare Pages, Cloudflare Workers |
| Package Manager | Bun |

## Environment Variables

Create `.env` files in each app directory:

### apps/web/.env
```env
VITE_API_URL=<your-api-worker-url>
VITE_AI_URL=<your-ai-worker-url>
```

### apps/api-worker/.env
```env
DATABASE_URL=<your-d1-database>
BETTER_AUTH_SECRET=<your-auth-secret>
```

### apps/ai-worker/.env
```env
CF_AI_API_TOKEN=<your-cloudflare-ai-token>
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

Built using [Cloudflare Workers](https://workers.cloudflare.com)

</div>
