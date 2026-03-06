# Copilot Instructions

## Project Overview

Bean Engine Backend is a NestJS content aggregation and AI-powered analytics engine that collects, processes, and analyzes tech content from sources including GitHub, Bilibili, HackerNews, and RSS feeds. It exposes REST APIs backed by Elasticsearch, PostgreSQL (via Prisma), and Neo4j.

## Commands

```bash
# Development
npm run start:dev       # Watch mode (auto-reload)
npm run start:debug     # Debug mode with inspector

# Build & Production
npm run build           # Compile TypeScript
npm run start:prod      # Run compiled dist/main.js

# Testing
npm run test            # Unit tests (*.spec.ts in src/)
npm run test:watch      # Watch mode
npm run test:cov        # With coverage
npm run test:e2e        # E2E tests (uses test/jest-e2e.json)

# Run a single test file
npx jest src/service/article.service.spec.ts

# Code quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format

# Database
npm run prisma:push     # Push schema to DB
npm run prisma:gen      # Regenerate Prisma client

# CLI commands (via nestjs-command)
npm run cli spider      # Crawl articles
npm run cli rss         # Process RSS feeds
npm run cli git         # GitHub data sync
npm run cli ai          # AI processing tasks
npm run cli es          # Elasticsearch operations
```

## Architecture

**Single monolithic NestJS module** (`src/modules/app.module.ts`) — no feature modules. All controllers and services register directly in `AppModule`.

**Layer structure:**
- `src/controller/` — REST API layer (Swagger-documented)
- `src/service/` — Business logic, organized by domain:
  - `service/ai/` — AI integrations (OpenAI, Gemini, DeepSeek, LangChain)
  - `service/spider/` — Web scraping (Puppeteer + stealth, Playwright, Cheerio)
  - `service/rss/` — RSS feed processing
  - `service/bili/` — Bilibili crawler
- `src/commands/` — CLI commands via `nestjs-command` (`@Command()` decorator)
- `src/prisma/` — PrismaModule + PrismaService (PostgreSQL)
- `src/config/index.ts` — Single config factory loaded via `ConfigModule.forRoot()`
- `src/enum/` — Shared constants (ES indices, source names, categories)
- `src/prompts/` — AI prompt templates

**Databases:**
- **PostgreSQL** via Prisma — Bilibili data models (`BiliUps`, `BiliVideos`, `VideoHonors`, `BiliUpAnalysis`, `HackNews`)
- **Elasticsearch** — Full-text search and article aggregation (index names in `src/enum/`)
- **Neo4j** — Graph data (module exists but currently commented out in AppModule)

**Swagger docs** available at `http://localhost:3001/docs` when running locally.

## Key Conventions

### Module Registration
All new controllers and services must be manually added to `AppModule` in `src/modules/app.module.ts` — both in the `controllers` array and `providers` array.

### Configuration Access
Config is namespaced. Access via `ConfigService.get('namespace.KEY')`:
```typescript
// src/config/index.ts defines: openai.GPT_KEY, google.geminiKey, deepseek.DS_KEY,
// feishu.FS_APP_ID, github.GITHUB_TOKEN, es.node, neo4j.*, etc.
this.configService.get('openai.GPT_KEY')
```

### Import Paths
Use absolute paths from `src/` root (not relative):
```typescript
import { ArticleService } from 'src/service/article.service';  // ✓
import { ArticleService } from '../service/article.service';   // ✗
```

### AI Service Pattern
Each LLM provider has its own file in `src/service/ai/`. The `AiToolService` composes them. New AI features should be added as methods on the appropriate provider service or `AiToolService`.

### CLI Commands
Commands use `nestjs-command` with the `@Command()` decorator. Register new commands in `AppModule` providers and create the command file in `src/commands/`.

### Environment Variables
All env vars are loaded in `src/config/index.ts`. Add new vars there and access them only through `ConfigService`, never `process.env` directly in services.
