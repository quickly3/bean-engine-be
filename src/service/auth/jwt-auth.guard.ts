import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtUserPayload {
  sub: number;
  username: string;
}

/**
 * JWT 鉴权 Guard。
 * 用法：在 Controller 或路由上 @UseGuards(JwtAuthGuard)，
 * 请求头携带 Authorization: Bearer <token>，校验通过后 payload 挂到 request.user。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string = request.headers['authorization'] || '';
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        '缺少 Authorization: Bearer <token> 请求头',
      );
    }

    try {
      const payload: JwtUserPayload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }
}
