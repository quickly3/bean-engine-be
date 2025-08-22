<div align="center">
  <h1>🚀 Bean Engine Backend</h1>
  <p>一个强大的内容聚合和搜索引擎后端服务平台</p>
</div>

## ✨ 主要功能

### 📑 多源内容爬取
- 支持掘金、CSDN、博客园、36氪等技术平台
- 使用 Scrapy 和 Puppeteer 实现爬虫功能
- 自动化数据采集和更新

### 🔍 搜索引擎
- 基于 Elasticsearch 的全文搜索
- 支持多维度内容检索

### 🕸️ 知识图谱
- 基于 Neo4j 构建知识关系网络
- 可视化内容之间的关联关系

### 🤖 AI 能力集成
- 集成 OpenAI GPT 和 Google Gemini API
- 提供内容分析和生成能力

### ⚡ 自动化任务
- 基于 Nest Schedule 的定时任务
- 自动执行爬虫和数据同步

### 📱 飞书集成
- 支持飞书平台消息通知
- 自动生成分析报告推送

## 🛠️ 技术栈

| 类别 | 技术 |
|-----|------|
| 框架 | NestJS |
| 数据库 | Elasticsearch, Neo4j |
| 爬虫 | Scrapy, Puppeteer |
| AI | OpenAI API, Google Gemini API |
| 任务调度 | Nest Schedule |

## 🚀 快速开始

### 1️⃣ 环境准备

创建 `.env` 文件并配置以下环境变量：

```env
DATABASE_URL=your_database_url
ELASTICSEARCH_URL=your_elasticsearch_url 
NEO4J_URL=your_neo4j_url
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 2️⃣ 安装运行

```bash
# 安装依赖
yarn install

# 开发环境
yarn start:dev

# 生产环境构建
yarn build

# 生产环境运行
yarn start:prod

# 使用 PM2 运行
pm2 start --name bean-be ./dist/src/main.js
```

### 3️⃣ 爬虫任务

```bash
# 掘金爬虫示例
cd scrapy/juejin
nohup python3 -m juejin_tag_crawl >> juejin_tag_crawl.log 2>&1 &
nohup python3 -m juejin_authors_crawl >> juejin_authors_crawl.log 2>&1 &
```

## 📁 项目结构

```
bean-engine-be/
├── src/           # 源代码目录
├── test/          # 测试文件
├── scrapy/        # Scrapy爬虫
├── puppeteer/     # Puppeteer爬虫
├── script/        # 工具脚本
└── shell/         # Shell脚本
```


npm run cli rss:resource >> rss.log 2>&1 &