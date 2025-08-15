import { Body, Controller, Get, Post } from '@nestjs/common';
import { ArticleService } from 'src/service/article.service';
import { readCsv } from 'src/utils/file';

@Controller('data')
export class DataController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('getGdpData')
  async getGdpData(@Body() payload) {
    const data = readCsv('data/world_bank/gdp.csv');
    return data;
  }
}
