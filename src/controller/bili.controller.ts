import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { convertBigIntToNumberInArray } from 'src/service/bili/bili-util';

@Controller('bili')
export class BiliController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('getUps')
  async getUps(@Body() payload: any) {
    const { page, pageSize, keywords } = payload;

    const where: any = {};
    let whereStr = Prisma.sql``;

    if (keywords && keywords.trim() !== '') {
      where.uname = { contains: keywords.trim() };
      whereStr = Prisma.sql`WHERE b.uname LIKE ${'%' + keywords.trim() + '%'}`;
    }

    const sql = Prisma.sql`
      SELECT b.*,count(1) "totalVideos",max(ba.created) "lastPublish"
        FROM "BiliUps" b 
        LEFT JOIN "BiliVideos" ba on ba.mid = b.mid
        ${whereStr}
        GROUP BY b.id
        ORDER BY b.id asc
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};
    `;

    const ups: any[] = await this.prisma.$queryRaw(sql);

    const total = await this.prisma.biliUps.count({ where });
    return {
      ...payload,
      data: convertBigIntToNumberInArray(ups),
      total,
    };
  }

  @Post('getUpVideos')
  async getUpVideos(@Body() payload: any) {
    const { page, pageSize, mid } = payload;
    const videos = await this.prisma.biliVideos.findMany({
      where: { mid },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'asc' },
    });

    const total = await this.prisma.biliVideos.count();

    return {
      ...payload,
      data: convertBigIntToNumberInArray(videos),
      total,
    };
  }
}
