import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SearchService } from '../service/search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('getAll')
  async getAll(@Body() payload) {
    return this.searchService.getAll(payload);
  }

  @Get('getTags')
  async getTags(@Query() params) {
    return this.searchService.getTags(params);
  }

  @Get('getCategories')
  async getCategories(@Query() params) {
    return this.searchService.getCategories(params);
  }

  @Get('autoComplete')
  async autoComplete(@Query() params) {
    return this.searchService.autoComplete(params);
  }

  @Post('getArticleHistogram')
  async getArticleHistogram(@Body() payload) {
    return this.searchService.getArticleHistogram(payload);
  }

  @Post('getWordsCloudByQueryBuilder')
  async getWordsCloudByQueryBuilder(@Body() payload) {
    return this.searchService.getWordsCloud(payload);
  }

  @Post('getAuthorTermsAgg')
  async getAuthorTermsAgg(@Body() payload) {
    return this.searchService.getAuthorTermsAgg(payload);
  }

  @Post('getTagsTermsAgg')
  async getTagsTermsAgg(@Body() payload) {
    return this.searchService.getTagsTermsAgg(payload);
  }

  @Post('getCatesTermsAgg')
  async getCatesTermsAgg(@Body() payload) {
    return this.searchService.getCatesTermsAgg(payload);
  }

  @Get('getWordsCloud')
  async getWordsCloud(@Query() params) {
    const resp = await this.searchService.getWordsCloud(params);
    return resp.data;
  }
}
