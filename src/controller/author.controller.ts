import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { AuthorService } from '../service/author.service';

@Controller('author')
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post('getAuthors')
  async getAll(@Body() payload) {
    return this.authorService.getAll(payload);
  }
}
