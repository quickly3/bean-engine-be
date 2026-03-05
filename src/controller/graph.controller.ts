import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GraphService } from 'src/service/graph.service';
import { SearchService } from 'src/service/search.service';

@ApiTags('graph')
@Controller('graph')
export class GraphController {
  constructor(
    private readonly graphService: GraphService,
    private readonly searchService: SearchService,
  ) {}

  @Get('getTotalGraph')
  @ApiOperation({ summary: '获取全量关系图数据' })
  @ApiOkResponse({ description: '全量图谱数据' })
  async getTotalGraph() {
    return this.graphService.getTotalGraph();
  }

  @Get('getLastDayData')
  @ApiOperation({ summary: '获取最近一天图谱数据' })
  @ApiOkResponse({ description: '最近一天图谱数据' })
  async getLastDayData() {
    return this.graphService.getLastDayData();
  }

  @Post('getTagsAgg')
  @ApiOperation({ summary: '获取标签聚合数据' })
  @ApiBody({
    description: '标签聚合查询参数',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiOkResponse({ description: '标签聚合结果' })
  async getTagsAgg(@Body() payload) {
    return this.graphService.getTagsAgg(payload);
  }

  @Get('dailyMd')
  @ApiOperation({ summary: '获取日报 Markdown 内容' })
  @ApiOkResponse({ description: '日报 Markdown 文本' })
  async dailyMd() {
    return this.searchService.dailyMd();
  }

  @Get('dailyKr')
  @ApiOperation({ summary: '获取 36Kr 日报内容' })
  @ApiOkResponse({ description: '36Kr 日报数据' })
  async dailyKr() {
    return this.searchService.dailyKr();
  }

  @Get('dailyGitHub')
  @ApiOperation({ summary: '获取 GitHub 日报内容' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: '可选日期参数',
  })
  @ApiOkResponse({ description: 'GitHub 日报数据' })
  async dailyGitHub(@Query() params) {
    return this.searchService.dailyGitHub(params);
  }
}
