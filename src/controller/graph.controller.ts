import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GraphService } from 'src/service/graph.service';
import { SearchService } from 'src/service/search.service';

@Controller('graph')
export class GraphController {
  constructor(
    private readonly graphService: GraphService,
    private readonly searchService: SearchService,
  ) {}

  @Get('getTotalGraph')
  async getTotalGraph() {
    return this.graphService.getTotalGraph();
  }

  @Get('getLastDayData')
  async getLastDayData() {
    return this.graphService.getLastDayData();
  }

  @Post('getTagsAgg')
  async getTagsAgg(@Body() payload) {
    return this.graphService.getTagsAgg(payload);
  }

  @Get('dailyMd')
  async dailyMd() {
    return this.searchService.dailyMd();
  }

  @Get('dailyKr')
  async dailyKr() {
    return this.searchService.dailyKr();
  }

  @Get('dailyGitHub')
  async dailyGitHub(@Query() params) {
    return this.searchService.dailyGitHub(params);
  }
}
