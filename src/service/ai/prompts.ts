export enum PROMPTS {
  // 文章摘要
  ARTICLE_SUMMARY = `请为我总结这篇文章的内容，100字以内,不要有废话，不要显示字数`,
  // 文章标题
  ARTICLE_TITLE = `请为我总结这篇文章的标题`,
  // 文章关键词
  ARTICLE_KEYWORD = `请为我总结这篇文章的关键词`,
  // 文章大纲
  ARTICLE_OUTLINE = `请为我总结这篇文章的大纲`,
  // 文章段落
  ARTICLE_PARAGRAPH = `请为我总结这篇文章的段落`,

  TRANSLATE_JOSN_TO_CN = `请将这段json中的{field}字段翻译成中文,并保存到{field}_cn字段中,并且不改变其他字段的值,请注意json的格式`,
}
