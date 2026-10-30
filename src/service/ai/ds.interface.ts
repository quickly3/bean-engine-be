export interface DeepSeekSearchOptions {
  /** 搜索词（1-128 字符，支持 site: / - / "..." / lang: / after: / before: 操作符） */
  query: string;
  /** 返回条数（1-50，默认 10） */
  count?: number;
  /** 触发搜索的原始问题（≤128 字符，用于提升查询理解） */
  ori_question?: string;
  /** 用于结果本地化的 IP 地址 */
  localization?: string;
  /** 是否返回页面正文 content（默认 false） */
  need_content?: boolean;
}

export interface DeepSeekSearchResult {
  /** 相关性得分（0-3，>=1.5 视为高质量结果） */
  rerank_score: number;
  title: string;
  url: string;
  /** 短摘要（约 100-200 字符，适合 UI 展示） */
  snippet: string;
  /** 长摘要（约 600-800 字符，适合喂给模型） */
  summary: string;
  /** 页面正文（need_content 为 false 或内容不可用时为空字符串） */
  content: string;
  site_name: string | null;
  site_icon: string | null;
  /** 发布时间（RFC 3339 UTC），未知为 null */
  date: string | null;
  /** 权威性等级 0-4（-1 未知，>=3 为高权威来源） */
  authority: number;
}

export interface DeepSeekSearchResponse {
  results: DeepSeekSearchResult[];
}

export interface DeepSeekFetchOptions {
  /** 要抓取的页面地址（HTTP/HTTPS，≤8192 字符） */
  url: string;
}

export interface DeepSeekFetchResponse {
  /** 页面标题，不可用时为空字符串 */
  title: string;
  /** 页面内容（Markdown 格式） */
  content: string;
}
