import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SearchService } from '../service/search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('getAll')
  @ApiOperation({ summary: '综合检索' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '综合检索结果' })
  async getAll(@Body() payload) {
    return this.searchService.getAll(payload);
  }

  @Get('getTags')
  @ApiOperation({ summary: '获取标签列表' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: '搜索关键词',
  })
  @ApiOkResponse({ description: '标签列表' })
  async getTags(@Query() params) {
    return this.searchService.getTags(params);
  }

  @Get('getCategories')
  @ApiOperation({ summary: '获取分类列表' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: '搜索关键词',
  })
  @ApiOkResponse({ description: '分类列表' })
  async getCategories(@Query() params) {
    return this.searchService.getCategories(params);
  }

  @Get('autoComplete')
  @ApiOperation({ summary: '自动补全' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: '补全关键词',
  })
  @ApiOkResponse({ description: '自动补全结果' })
  async autoComplete(@Query() params) {
    return this.searchService.autoComplete(params);
  }

  @Post('getArticleHistogram')
  @ApiOperation({ summary: '获取文章趋势直方图' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '文章趋势直方图' })
  async getArticleHistogram(@Body() payload) {
    return this.searchService.getArticleHistogram(payload);
  }

  @Post('getWordsCloudByQueryBuilder')
  @ApiOperation({ summary: '通过查询条件获取词云' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '词云结果' })
  async getWordsCloudByQueryBuilder(@Body() payload) {
    return this.searchService.getWordsCloud(payload);
  }

  @Post('getAuthorTermsAgg')
  @ApiOperation({ summary: '获取作者词项聚合' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '作者词项聚合结果' })
  async getAuthorTermsAgg(@Body() payload) {
    return this.searchService.getAuthorTermsAgg(payload);
  }

  @Post('getTagsTermsAgg')
  @ApiOperation({ summary: '获取标签词项聚合' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '标签词项聚合结果' })
  async getTagsTermsAgg(@Body() payload) {
    return this.searchService.getTagsTermsAgg(payload);
  }

  @Post('getCatesTermsAgg')
  @ApiOperation({ summary: '获取分类词项聚合' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '分类词项聚合结果' })
  async getCatesTermsAgg(@Body() payload) {
    return this.searchService.getCatesTermsAgg(payload);
  }

  @Get('getWordsCloud')
  @ApiOperation({ summary: '获取词云' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: '可选关键词',
  })
  @ApiOkResponse({ description: '词云结果' })
  async getWordsCloud(@Query() params) {
    const resp = await this.searchService.getWordsCloud(params);
    return resp.data;
  }

  @Post('getHackerNews')
  @ApiOperation({ summary: '获取 Hacker News 数据' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: 'Hacker News 查询结果' })
  async getHackerNews(@Body() payload) {
    return this.searchService.getHackerNews(payload);
  }
}
