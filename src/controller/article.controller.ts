import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticleService } from 'src/service/article.service';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('getHistogram')
  @ApiOperation({ summary: '获取文章直方图' })
  @ApiBody({
    description: '统计参数',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'object', description: '查询条件' },
        calendar_interval: { type: 'string', description: '时间间隔' },
      },
    },
  })
  @ApiOkResponse({ description: '文章直方图结果' })
  async getHistogram(@Body() payload) {
    const { query: query_string, calendar_interval } = payload;
    return this.articleService.getHistogram(query_string, calendar_interval);
  }

  @Post('getAuthorTermsAgg')
  @ApiOperation({ summary: '获取作者聚合统计' })
  @ApiBody({
    description: '聚合参数',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiOkResponse({ description: '作者聚合结果' })
  async getAll(@Body() payload) {
    return this.articleService.getAuthorTermsAgg();
  }
}
