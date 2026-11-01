import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

export interface SafeUser {
  id: number;
  username: string;
  nickname: string | null;
  lastLoginAt: Date | null;
  createdAt: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** 创建账号（供 CLI 调用） */
  async createUser(
    username: string,
    password: string,
    nickname?: string,
  ): Promise<SafeUser> {
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) {
      throw new ConflictException(`用户 ${username} 已存在`);
    }
    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: { username, nickname, passwordHash },
    });
    return this.toSafeUser(user);
  }

  /** 账号列表（供 CLI 调用） */
  async listUsers(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({ orderBy: { id: 'asc' } });
    return users.map((u) => this.toSafeUser(u));
  }

  /** 重置密码（供 CLI 调用） */
  async resetPassword(username: string, password: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException(`用户 ${username} 不存在`);
    }
    const passwordHash = await this.hashPassword(password);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return this.toSafeUser(updated);
  }

  /** 登录：校验密码并签发 JWT */
  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const payload = { sub: user.id, username: user.username };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.toSafeUser(user),
    };
  }

  /** scrypt 哈希，格式: scrypt:<salt>:<hash>（均为 hex） */
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${derived.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    stored: string,
  ): Promise<boolean> {
    const [algo, salt, hash] = stored.split(':');
    if (algo !== 'scrypt' || !salt || !hash) {
      return false;
    }
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    return (
      expected.length === derived.length && timingSafeEqual(expected, derived)
    );
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
