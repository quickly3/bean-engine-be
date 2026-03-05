# Bean Engine Backend - 项目结构

> 本文档用于帮助 AI 助手和开发者快速理解项目架构和代码组织  
> 最后更新：2026-03-05

## 技术栈

- **框架**: NestJS (基于 Node.js 的企业级后端框架)
- **语言**: TypeScript
- **数据库**: Prisma ORM + PostgreSQL
- **搜索引擎**: Elasticsearch
- **任务调度**: @nestjs/schedule
- **CLI**: nestjs-command

## 核心目录结构

```
bean-engine-be/
├── src/                          # 源代码目录
│   ├── main.ts                   # 应用入口文件
│   ├── cli.ts                    # CLI 入口文件
│   ├── controller/               # 控制器层（API 路由）
│   ├── service/                  # 业务逻辑层
│   ├── modules/                  # NestJS 模块配置
│   ├── commands/                 # CLI 命令定义
│   ├── prisma/                   # Prisma 客户端封装
│   ├── config/                   # 配置文件
│   ├── enum/                     # 枚举和常量
│   └── utils/                    # 工具函数
├── prisma/                       # Prisma schema 和迁移
├── script/                       # 独立脚本和测试代码
├── scrapy/                       # Python 爬虫代码
├── data/                         # 静态数据文件
├── output/                       # 输出文件目录
└── test/                         # E2E 测试

```

## 详细目录说明

### 📁 src/controller/
**职责**: 定义 HTTP API 路由，处理请求和响应  
**原则**: 只做参数接收、验证和调用 service，不包含业务逻辑

主要控制器：
- `app.controller.ts` - 应用基础接口
- `article.controller.ts` - 文章管理接口
- `author.controller.ts` - 作者管理接口
- `search.controller.ts` - 搜索接口
- `feishu.controller.ts` - 飞书集成接口
- `bili.controller.ts` - B站数据接口
- `spider.controller.ts` - 爬虫控制接口
- `cron.controller.ts` - 定时任务管理
- `ai.controller.ts` - AI 相关接口
- `graph.controller.ts` - 图数据接口
- `data.controller.ts` - 数据导出接口

### 📁 src/service/
**职责**: 实现业务逻辑和数据访问  
**原则**: 包含所有业务规则、数据处理、第三方 API 调用

```
service/
├── *.service.ts                  # 各模块核心服务
├── ai/                           # AI 相关服务
│   ├── OpenAi.ts                 # OpenAI 集成
│   ├── Gemini.ts                 # Google Gemini 集成
│   ├── prompts.service.ts        # Prompt 模板管理
│   └── aiTool.service.ts         # AI 工具服务
├── spider/                       # 爬虫服务
│   ├── spider.service.ts         # 爬虫核心服务
│   └── crawlers/                 # 各站点爬虫实现
│       ├── kr36.crawler.ts       # 36氪
│       ├── bilibili.crawler.ts   # B站
│       ├── csdn.crawler.ts       # CSDN
│       └── oschina.crawler.ts    # 开源中国
├── feishu/                       # 飞书机器人服务
│   ├── feishuRobot.ts            # 飞书 API 封装
│   └── messageHandle.service.ts  # 消息处理逻辑
├── bili/                         # B站数据分析服务
│   └── bili.service.ts           # B站用户和内容分析
├── rss/                          # RSS 订阅服务
│   └── rss.service.ts            # RSS 抓取和解析
└── tools/                        # 工具服务

```

### 📁 src/modules/
**职责**: NestJS 模块配置和依赖注入  
**文件**: `app.module.ts` - 根模块，注册所有 controllers 和 providers

### 📁 src/commands/
**职责**: 定义 CLI 命令，用于后台任务和数据处理  

命令列表：
- `es.command.ts` - Elasticsearch 数据管理
- `ai.command.ts` - AI 批处理任务
- `spider.command.ts` - 爬虫执行命令
- `rss.command.ts` - RSS 订阅更新
- `git.command.ts` - Git 相关操作

### 📁 src/prisma/
**职责**: Prisma 客户端的 NestJS 封装  
- `prisma.module.ts` - Prisma 模块
- `prisma.service.ts` - Prisma 服务（单例）

### 📁 prisma/
**职责**: 数据库 Schema 和迁移  
- `schema.prisma` - 数据模型定义
- `migrations/` - 数据库迁移历史

### 📁 script/
**职责**: 独立脚本和实验性代码  
- `langchain/` - LangChain 测试代码
- `openai/` - OpenAI API 测试
- `rss/` - RSS 测试脚本

### 📁 scrapy/
**职责**: Python Scrapy 爬虫项目  
- 各平台的专业爬虫实现
- 与 NestJS 后端数据互通

## 架构模式

### 分层架构
```
┌─────────────────────────────────────┐
│         Controller Layer            │  HTTP 请求处理
│   (路由定义、参数验证、响应格式化)   │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│          Service Layer              │  业务逻辑
│   (业务规则、数据处理、外部调用)    │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         Data Access Layer           │  数据访问
│     (Prisma, Elasticsearch)         │
└─────────────────────────────────────┘
```

### 依赖注入规则
1. Controller 通过构造函数注入需要的 Service
2. Service 之间可以相互注入，但要避免循环依赖
3. 所有 providers 必须在 `app.module.ts` 中注册

### 新增 API 标准流程
根据 `.github/skills/create-api/SKILL.md` 规范：

1. **定位模块** - 找到对应的 `*.controller.ts` 和 `*.service.ts`
2. **Controller 新增路由** - 使用 `@Get/@Post/@Patch/@Delete` 装饰器
3. **Service 新增方法** - 实现具体业务逻辑
4. **Module 注册** - 确保 controller/service 在 module 中注册
5. **验证** - 编译通过，路由可访问

## 核心功能模块

### 🔍 搜索引擎 (Elasticsearch)
- 文章全文搜索
- 作者搜索
- 相关性排序

### 🤖 AI 集成
- OpenAI GPT 系列
- Google Gemini
- Prompt 模板管理
- 内容生成和分析

### 🕷️ 爬虫系统
支持平台：
- 36氪 (kr36)
- B站 (bilibili)
- CSDN
- 开源中国 (oschina)
- 掘金 (juejin)

### 📅 定时任务
- 每日报告生成
- RSS 订阅更新
- 定期数据抓取

### 🔔 飞书机器人
- 消息接收和处理
- AI 助手集成
- 事件回调处理

## 环境配置

配置文件位置：`src/config/index.ts`  
环境变量管理：`.env` (未提交到 Git)

主要配置项：
- 数据库连接
- Elasticsearch 连接
- OpenAI/Gemini API Key
- 飞书应用凭证

## 运行方式

### HTTP 服务
```bash
# 开发模式
yarn start:dev

# 生产模式
yarn start:prod
```

### CLI 命令
```bash
# 查看所有命令
yarn cli --help

# 执行特定命令
yarn cli [command-name]
```

## 数据流向

```
外部请求 → Controller → Service → Database/ES → Service → Controller → 响应
                         ↓
                    External APIs
                  (OpenAI, Gemini, etc.)
```

## 注意事项

1. **代码风格**: 遵循 ESLint 配置
2. **命名规范**: 
   - Controller: `*.controller.ts`
   - Service: `*.service.ts`
   - Module: `*.module.ts`
3. **错误处理**: 使用 try-catch 包裹异步操作
4. **类型安全**: 充分利用 TypeScript 类型系统
5. **文档**: 复杂逻辑添加注释说明

## AI 助手使用指南

当需要理解或修改代码时：

1. **先看这个文档** - 了解整体架构
2. **定位模块** - 根据功能找到对应的 controller/service
3. **查看关联** - 检查 module 注册和依赖注入
4. **遵循规范** - 按照 `.github/skills/` 中的最佳实践
5. **最小修改** - 只改必要的文件，保持代码一致性

---

**生成工具**: 可使用以下命令更新此文档
```bash
# Windows PowerShell
tree /F /A src > structure.txt
```

**维护**: 当添加新的模块或重大重构时，请更新此文档
