import { Body, Controller, Get, Post } from '@nestjs/common';
import { SearchService } from '../service/search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('getAll')
  async getAll(@Body() payload) {
    return this.searchService.getAll(payload);
  }
}
