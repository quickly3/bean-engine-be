import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticleService } from 'src/service/article.service';
import { readCsv } from 'src/utils/file';

@ApiTags('data')
@Controller('data')
export class DataController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('getGdpData')
  @ApiOperation({ summary: '获取 GDP CSV 数据' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: 'GDP 数据列表' })
  async getGdpData(@Body() payload) {
    const data = readCsv('data/world_bank/gdp.csv');
    return data;
  }
}
