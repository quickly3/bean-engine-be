# 观察者网·风闻社区 用户主页爬取分析

> 目标页面：`https://user.guancha.cn/user/personal-homepage?uid=218155`
> 示例用户：**陈经**（亚洲视觉科技研发总监），uid=218155
> 分析日期：2026-06-28

## 一、页面概览

该页面是「观察者网·风闻社区」的**用户个人主页**，本质是某个作者的文章列表 + 个人资料聚合页。页面通过 `uid` 参数定位用户，结构清晰、内容稳定，非常适合定向爬取与后续 AI 分析（观点提取、情绪分析、话题趋势、KOL 画像等）。

整体可爬取的数据分为三层：

1. **用户资料层**（主页头部）
2. **文章列表层**（主页正文，支持「加载更多」分页）
3. **文章详情层**（点进每篇文章后的正文 + 互动 + 评论）

---

## 二、可爬取的有价值内容（按层级拆解）

### 1. 用户资料层（个人画像）

主页头部即包含完整的 KOL 画像数据，价值很高：

| 字段 | 示例值 | 说明 / 分析价值 |
| --- | --- | --- |
| `nickname` | 陈经 | 作者昵称 |
| `title` / `identity` | 亚洲视觉科技研发总监 | 认证身份，反映领域权威性 |
| `avatar` | 等级图标 / 头像 URL | 用户等级、形象 |
| `level` | lv1-blue | 社区等级 |
| `article_count` | 2502（已发布 2494） | 文章总量，衡量活跃度 |
| `reply_count` | 318 | 回复数 |
| `be_replied_count` | 104452 | 被回复数，衡量影响力/争议度 |
| `collect_count` | 1 | 收藏数 |
| `like_count` | 2 | 获赞数 |
| `follow_topic_count` | 0 | 关注话题数 |

> **分析价值**：可建立作者影响力指标（被回复数、文章量），用于筛选高价值 KOL；身份字段可做领域归类（科技/财经/军事等）。

### 2. 文章列表层（主页 Feed）

主页正文是按时间倒序排列的文章列表，每条 item 可提取：

| 字段 | 示例值 | 说明 |
| --- | --- | --- |
| `article_id` | 1678154 | 文章唯一 ID（来自 `content?id=` ） |
| `url` | `https://user.guancha.cn/main/content?id=1678154` | 详情页链接 |
| `title` | 长荣挂新加坡籍的船不听伊朗的，过霍尔木兹海峡被炸了 | 标题 |
| `publish_time` | 2小时前 / 昨天 11:02 / 06-26 10:35 | 发布时间（相对/绝对混合，需归一化） |
| `summary` | 文章前 ~100 字摘要 | 列表页直接给出，可用于快速分类 |

> **分页机制**：底部有「加载更多」按钮（`[加载更多](#)`），通常对应一个 **AJAX 接口**（按 `uid` + `page`/`offset` 返回 JSON 或 HTML 片段）。**建议优先抓接口而非渲染 DOM**，效率高且稳定。需用浏览器开发者工具的 Network 面板确认接口地址与参数。

### 3. 文章详情层（最核心的分析素材）

点进每篇文章（`/main/content?id=xxx`）可获取完整内容，价值最高：

#### 3.1 正文与元数据
| 字段 | 示例 | 说明 |
| --- | --- | --- |
| `title` | 长荣挂新加坡籍的船… | 完整标题 |
| `author` + `author_uid` | 陈经 / 218155 | 作者 |
| `author_title` | 亚洲视觉科技研发总监 | 作者身份 |
| `publish_time` | 2小时前 | 发布时间 |
| `content` | 完整正文（分段） | **核心文本，用于 AI 分析** |
| `images` | `https://i.guancha.cn/bbs/2026/06/28/...jpg` | 配图 URL 列表 |
| `location` | 发表于广东省 | 作者 IP 属地 |
| `like_count` | 44 | 文章点赞数 |

#### 3.2 评论数据（高价值的舆情/情绪素材）
评论分「热门评论」和「全部评论」，每条评论可提取：

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| `commenter` + `uid` | 啊尔萨斯 / 91103 | 评论者 |
| `content` | 就是那个台独吗，炸的好 | 评论正文 |
| `time` | 1小时前 | 评论时间 |
| `location` | 来自湖南省 | 评论者属地 |
| `up_count` / `down_count` | 赞 24 / 踩 0 | 互动数据 |
| `comment_total` | 全部评论 7 条 | 评论总数 |

> **分析价值**：评论区是**舆情情绪分析**的金矿，可做情感分类、地域分布、观点对立度、热点话题共识度等分析。

---

## 三、推荐爬取策略

### 抓取流程
```
1. 输入 uid → 请求用户主页，解析「用户资料层」
2. 调用「加载更多」对应的列表接口，按 page 翻页，
   累积全部「文章列表层」item（article_id + 标题 + 摘要 + 时间）
3. 遍历 article_id，请求每篇「文章详情层」，
   抽取正文 / 配图 / 点赞 / 评论
4. 时间字段归一化（相对时间 → 绝对时间戳）
5. 入库PG+ 送 AI 做分类、摘要、情绪分析
```

### 技术建议
- **反爬**：页面底部出现「拖动拼图完成验证 / 安全验证」滑块验证码，说明站点有**风控**。高频抓取会触发。建议：
  - 控制请求频率（加随机延时）、复用 Cookie/Session；
  - 优先走列表 AJAX 接口（数据量小、更隐蔽）；
  - 必要时配合本仓库已有的 `service/spider/`（Puppeteer + stealth / Playwright）应对 JS 渲染与验证码。
- **解析**：列表页与详情页是服务端渲染 HTML，可用 Cheerio 解析 DOM；若有 JSON 接口则直接解析 JSON。
- **去重**：以 `article_id` 为主键去重；增量抓取只需对比最新文章时间。

---

## 四、建议的数据模型（用于入库）

```ts
// 作者
GuanUser {
  uid: string            // 主键
  nickname: string
  title: string          // 认证身份
  level: string
  articleCount: number
  replyCount: number
  beRepliedCount: number
  likeCount: number
  collectCount: number
  crawledAt: Date
}

// 文章
GuanArticle {
  articleId: string      // 主键，来自 content?id=
  authorUid: string      // 关联 GuanUser
  title: string
  summary: string        // 列表页摘要
  content: string        // 详情页正文
  images: string[]
  publishTime: Date      // 归一化后
  location: string       // IP 属地
  likeCount: number
  commentCount: number
  url: string
  crawledAt: Date
  // AI 衍生字段
  category?: string      // AI 分类（财经/军事/科技/体育…）
  aiSummary?: string
  sentiment?: string
}

// 评论（可选，舆情分析用）
GuanComment {
  id: string
  articleId: string      // 关联 GuanArticle
  commenterUid: string
  commenter: string
  content: string
  time: Date
  location: string
  upCount: number
  downCount: number
}
```

---

## 五、可做的分析方向（爬取后的价值变现）

1. **作者 KOL 画像**：高产作者识别、领域聚焦度、影响力评分（被回复数 / 点赞 / 文章量）。
2. **话题趋势分析**：基于文章标题/正文做主题聚类，追踪某作者关注的领域随时间的变化（如本例作者高频涉及：AI 大模型、中美科技、财经市值、地缘政治、世界杯）。
3. **观点/立场提取**：用 LLM 抽取每篇文章的核心论点，构建观点知识库。
4. **情绪与舆情分析**：基于评论区做情感分类、地域舆情分布、观点对立度。
5. **热点预测**：结合点赞/评论/被回复增速，识别正在升温的话题。

---

## 六、与本仓库现有架构的对接

- 爬虫逻辑放入 `src/service/guan/guan.service.ts`（已存在空骨架）。
- 复杂渲染/验证码场景复用 `src/service/spider/`（Puppeteer + stealth / Playwright）。
- HTML 解析用 Cheerio；接口数据直接 JSON 解析。
- 存储：结构化数据入 PostgreSQL（Prisma，新增上述模型）；全文与摘要可同步进 Elasticsearch 供检索。
- AI 分类/摘要/情绪：调用 `service/ai/`（`AiToolService` 统一组合 OpenAI/Gemini/DeepSeek）。
- 通过 CLI 触发：在 `src/commands/` 新增子命令（参考现有 `guan` 命令，`npm run cli -- guan -- -c <subcommand>`）。
