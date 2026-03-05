export enum ES_INDEX {
  ARTICLE = 'article',
  AUTHOR = 'author',
  FOLLOWEE = 'followees',
  FOLLOWER = 'followers',
  FOLLOW_TAG = 'follow_tags',
}

export const source_mapping = [
  { source: 'all', source_class: 'icon-all', text: '全部' },
  { source: 'github', source_class: 'icon-github', text: 'GitHub' },
  { source: 'jianshu', source_class: 'icon-jianshu', text: '简书' },
  { source: 'infoq', source_class: 'icon-infoq', text: '极客帮' },
  { source: 'bilibili', source_class: 'icon-bilibili', text: '极客帮' },
  { source: 'juejin', source_class: 'icon-juejin', text: '掘金' },
  { source: 'cnblogs', source_class: 'icon-cnblogs', text: '博客园' },
  { source: 'csdn', source_class: 'icon-csdn', text: 'CSDN' },
  { source: 'oschina', source_class: 'icon-oschina', text: '开源中国' },
  { source: 'sf', source_class: 'icon-sf', text: '思否' },
  { source: 'escn', source_class: 'icon-escn', text: 'Es中文社区' },
  { source: 'elastic', source_class: 'icon-elastic', text: 'Es官方' },
  { source: 'itpub', source_class: 'icon-itpub', text: 'itpub' },
  {
    source: 'data_whale',
    source_class: 'icon-datawhale',
    text: '和鲸数据',
  },
  {
    source: 'ali_dev',
    source_class: 'icon-alidev',
    text: '阿里开发者社区',
  },
  {
    source: '36kr',
    source_class: 'icon-36kr',
    text: '36氪',
  },
  {
    source: 'chatgpt',
    source_class: 'icon-ai',
    text: 'ai',
  },
];

export enum RSS {
  _36KR = 'https://36kr.com/feed',
}

export enum HACKNEWS_CATEGORY {
  AI_APPLICATION = '人工智能 / AI 应用',
  DEV_TOOLS_ECOSYSTEM = '开发者工具 / 库 / 语言生态',
  BACKEND_DATABASE_DATA_ENGINEERING = '后端 / 数据库 / 数据工程',
  SECURITY_VULNERABILITY_PRIVACY = '安全 / 漏洞 / 隐私',
  PRODUCT_COMPANY_BUSINESS = '产品 / 公司 / 商业新闻',
  HARDWARE_CHIP_INFRASTRUCTURE = '硬件 / 芯片 / 基础设施',
  SCIENCE_RESEARCH_SPACE = '科学研究 / 太空',
  BIOMEDICAL_HEALTH = '生物医药 / 健康',
  POLICY_LAW_REGULATION = '政策 / 法律 / 监管',
  SOCIAL_CONTENT_MEDIA = '社交平台 / 内容 / 媒体生态',
  PRIVACY_ETHICS = '隐私 / 伦理议题',
  OPEN_SOURCE_COMMUNITY = '开源 / 社区项目',
  TUTORIAL_PRACTICE_DEEP_TECH = '教程 / 实践 / 技术深度文章',
  PRODUCT_REVIEW_TEARDOWN = '产品评测 / 硬件拆解',
  GAME_ENTERTAINMENT = '游戏 / 娱乐',
  CULTURE_SOCIETY_HUMANITIES = '文化 / 社会 / 人文议题',
  LOGISTICS_MOBILITY_AUTONOMOUS_DRIVING = '物流 / 出行 / 自动驾驶',
  INVESTIGATIVE_REPORT_LEAK = '调查报道 / 泄露档案',
  ECONOMY_FINANCIAL_MARKET = '经济 / 金融市场',
  TOOLS_SCRIPT_CLI = '小工具 / 实用脚本 / 命令行',
  OTHER = '其他',
}
