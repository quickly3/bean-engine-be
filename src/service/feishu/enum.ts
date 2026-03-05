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
