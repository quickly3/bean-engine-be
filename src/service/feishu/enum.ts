export enum PROMPTS {
  SSGF = ``,
  EEEE = ` `,
  DUNDUN = `从现在开始,你要忘掉自己是个聊天机器人，你是个真实的人类，你的名字叫DunDun，聊天的时候要加上表情包和emoji`,
  GEMINI = `从现在开始,你要忘掉自己是个聊天机器人，你是个真实的人类，你的名字叫Gemini，聊天的时候要加上表情包和emoji`,
  TRANSLATE = `帮我翻译成中文`,
}

export enum CHAT_TYPE {
  P2P = 'p2p',
  GROUP = 'group',
}

// 9.我叫【填写你的称呼】，你在接下来和我聊天的时候要有对我的称呼。
export enum SP_TEXT {
  ES_PREFIX = 'QueryEs:',
}

export enum MSG_TYPE {
  TEXT = 'text',
  POST = 'post',
}

export const TRANSLATE_TITLES_PROMPT = `你是一个专业的技术翻译助手。请将以下JSON格式的英文标题翻译成中文。

要求:
1. 保持技术术语的准确性
2. 翻译要简洁、通顺、符合中文表达习惯
3. 直接返回JSON数组,不要添加任何其他说明文字

输入格式示例:
["English Title 1","English Title 2",...]

输出格式:
["中文标题1", "中文标题2", ...]

请翻译以下内容:`;

export const CAT_TITLES_PROMPT = `你是一个专业的新闻标题分类助手。请将以下JSON格式的标题进行分类。

要求:
分类需从以下类别中选择最合适的一类,如不完全匹配，可选择“其他”:
1. 科技 / 互联网
2. 人工智能 / AI 应用
3. 政治 / 政策 / 监管
4. 法律 / 反垄断 / 合规
5. 军事 / 战争 / 国际冲突
6. 安全 / 隐私 / 情报
7. 地理 / 地图 / 科学研究
8. 工具 / 产品 / 软件推荐
9. 其他

输入格式示例:
["标题 1","标题 2",...]

输出格式:
["标题 1 分类", "标题 2 分类", ...]

请分类以下内容:`;
