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
