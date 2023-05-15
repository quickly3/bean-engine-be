import { Body, Controller, Get, Post } from '@nestjs/common';
import { SearchService } from 'src/service/search.service';

@Controller()
export class AppController {
  constructor(private readonly searchService: SearchService) {}

  @Post('getAll')
  async getAll(@Body() payload) {
    return this.searchService.getAll(payload);
  }
}
