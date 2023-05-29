import { Body, Controller, Get, Post } from '@nestjs/common';
import { ArticleService } from 'src/service/article.service';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('getHistogram')
  async getHistogram(@Body() payload) {
    const { query: query_string, calendar_interval } = payload;
    return this.articleService.getHistogram(query_string, calendar_interval);
  }

  @Post('getAuthorTermsAgg')
  async getAll(@Body() payload) {
    return this.articleService.getAuthorTermsAgg();
  }
}
