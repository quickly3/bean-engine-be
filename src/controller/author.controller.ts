import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorService } from '../service/author.service';

@ApiTags('author')
@Controller('author')
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post('getAuthors')
  @ApiOperation({ summary: '获取作者列表' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '作者列表结果' })
  async getAll(@Body() payload) {
    return this.authorService.getAll(payload);
  }
}
