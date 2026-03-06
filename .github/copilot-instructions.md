<<<<<<< HEAD
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
=======
# Copilot 使用说明

## 语言要求

**请始终使用中文与用户交流**，包括回复、解释、代码注释建议及所有说明文字。

## 项目概述

Bean Engine Backend 是一个基于 NestJS 的内容聚合与 AI 分析引擎，从 GitHub、Bilibili、HackerNews 和 RSS 等来源收集、处理和分析技术内容，通过 Elasticsearch、PostgreSQL（via Prisma）和 Neo4j 提供 REST API。

## 常用命令

```bash
# 开发
npm run start:dev       # 监听模式（自动重载）
npm run start:debug     # 调试模式（带 inspector）

# 构建与生产
npm run build           # 编译 TypeScript
npm run start:prod      # 运行编译后的 dist/main.js

# 测试
npm run test            # 单元测试（src/ 下 *.spec.ts）
npm run test:watch      # 监听模式
npm run test:cov        # 带覆盖率
npm run test:e2e        # E2E 测试（使用 test/jest-e2e.json）

# 运行单个测试文件
npx jest src/service/article.service.spec.ts

# 代码质量
npm run lint            # ESLint 自动修复
npm run format          # Prettier 格式化

# 数据库
npm run prisma:push     # 推送 schema 到数据库
npm run prisma:gen      # 重新生成 Prisma client

# CLI 命令（via nestjs-command）
npm run cli spider      # 爬取文章
npm run cli rss         # 处理 RSS 订阅
npm run cli git         # GitHub 数据同步
npm run cli ai          # AI 处理任务
npm run cli es          # Elasticsearch 操作
```

## 架构说明

**单体 NestJS 模块**（`src/modules/app.module.ts`）——无功能子模块，所有 controller 和 service 直接注册到 `AppModule`。

**层级结构：**
- `src/controller/` — REST API 层（Swagger 文档化）
- `src/service/` — 业务逻辑，按领域组织：
  - `service/ai/` — AI 集成（OpenAI、Gemini、DeepSeek、LangChain）
  - `service/spider/` — 网页爬取（Puppeteer + stealth、Playwright、Cheerio）
  - `service/rss/` — RSS 订阅处理
  - `service/bili/` — Bilibili 爬虫
- `src/commands/` — CLI 命令（使用 `@Command()` 装饰器）
- `src/prisma/` — PrismaModule + PrismaService（PostgreSQL）
- `src/config/index.ts` — 统一配置工厂，通过 `ConfigModule.forRoot()` 加载
- `src/enum/` — 共享常量（ES 索引名、来源名称、分类）
- `src/prompts/` — AI 提示词模板

**数据库：**
- **PostgreSQL** via Prisma — Bilibili 数据模型（`BiliUps`、`BiliVideos`、`VideoHonors`、`BiliUpAnalysis`、`HackNews`）
- **Elasticsearch** — 全文搜索和文章聚合（索引名在 `src/enum/` 中定义）
- **Neo4j** — 图数据（模块已存在，目前在 AppModule 中被注释掉）

**Swagger 文档**本地运行时访问：`http://localhost:3001/docs`

## 关键约定

### 模块注册
所有新的 controller 和 service 必须手动添加到 `src/modules/app.module.ts` 的 `AppModule` 中——`controllers` 数组和 `providers` 数组都需要添加。

### 配置访问
配置按命名空间划分，通过 `ConfigService.get('namespace.KEY')` 访问：
```typescript
// src/config/index.ts 定义了：openai.GPT_KEY、google.geminiKey、deepseek.DS_KEY、
// feishu.FS_APP_ID、github.GITHUB_TOKEN、es.node、neo4j.* 等
this.configService.get('openai.GPT_KEY')
```

### 导入路径
使用从 `src/` 根目录的绝对路径（不使用相对路径）：
>>>>>>> copilot-worktree-2026-03-06T06-04-28
```typescript
import { ArticleService } from 'src/service/article.service';  // ✓
import { ArticleService } from '../service/article.service';   // ✗
```

<<<<<<< HEAD
### AI Service Pattern
Each LLM provider has its own file in `src/service/ai/`. The `AiToolService` composes them. New AI features should be added as methods on the appropriate provider service or `AiToolService`.

### CLI Commands
Commands use `nestjs-command` with the `@Command()` decorator. Register new commands in `AppModule` providers and create the command file in `src/commands/`.

### Environment Variables
All env vars are loaded in `src/config/index.ts`. Add new vars there and access them only through `ConfigService`, never `process.env` directly in services.
=======
### AI 服务模式
每个 LLM 提供商在 `src/service/ai/` 下有独立文件，由 `AiToolService` 统一组合调用。新 AI 功能应作为方法添加到对应提供商的 service 或 `AiToolService` 上。

### CLI 命令
命令使用 `nestjs-command` 的 `@Command()` 装饰器，在 `AppModule` providers 中注册，并在 `src/commands/` 下创建命令文件。

### 环境变量
所有环境变量在 `src/config/index.ts` 中加载，只通过 `ConfigService` 访问，禁止在 service 中直接使用 `process.env`。
>>>>>>> copilot-worktree-2026-03-06T06-04-28
