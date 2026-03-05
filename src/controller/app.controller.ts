import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from 'src/service/search.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly searchService: SearchService) {}

  @Post('getAll')
  @ApiOperation({ summary: '全量搜索（根路由）' })
  @ApiBody({
    description: '搜索参数',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiOkResponse({ description: '搜索结果' })
  async getAll(@Body() payload) {
    return this.searchService.getAll(payload);
  }
}
