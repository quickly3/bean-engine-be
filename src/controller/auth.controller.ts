import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from 'src/service/auth/auth.service';
import { JwtAuthGuard } from 'src/service/auth/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '账号密码登录，返回 JWT accessToken' })
  @ApiBody({
    description: '登录参数',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: '用户名', example: 'admin' },
        password: { type: 'string', description: '密码', example: '123456' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiOkResponse({ description: '登录成功，返回 accessToken 与用户信息' })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误' })
  async login(@Body() payload: { username?: string; password?: string }) {
    const username = payload?.username?.trim();
    const password = payload?.password;
    if (!username || !password) {
      throw new BadRequestException('username 和 password 不能为空');
    }
    return this.authService.login(username, password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息（需 Bearer Token）' })
  @ApiOkResponse({ description: '当前 Token 对应的用户信息' })
  @ApiUnauthorizedResponse({ description: 'Token 缺失、无效或已过期' })
  getProfile(@Request() req: { user: { sub: number; username: string } }) {
    return req.user;
  }
}
