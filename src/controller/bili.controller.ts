import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import _ from 'lodash';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  convertBigIntToNumberInArray,
  convertBigIntToNumberInObject,
} from 'src/service/bili/bili-util';

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
      SELECT b.*,count(1) "totalVideos",bua.id as "analysisId" ,max(ba.created) "lastPublish"
        FROM "BiliUps" b 
        LEFT JOIN "BiliUpAnalysis" bua on bua.mid = b.mid
        LEFT JOIN "BiliVideos" ba on ba.mid = b.mid
        ${whereStr}
        GROUP BY b.id,bua.id
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

    const where = { mid };
    const videos = await this.prisma.biliVideos.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.biliVideos.count({ where });

    const aids = videos.map((v) => v.aid);

    if (aids.length > 0) {
      const honors = await this.prisma.videoHonors.findMany({
        where: { aid: { in: aids } },
      });
      videos.map((v: any) => {
        v.honors = _.filter(honors, (h) => h.aid === v.aid);
      });
    }

    return {
      ...payload,
      data: convertBigIntToNumberInArray(videos),
      total,
    };
  }

  @Post('getUpAnalysis')
  async getUpAnalysis(@Body() payload: any) {
    const { analysisId } = payload;
    console.log('analysisId', analysisId);
    let ana = await this.prisma.biliUpAnalysis.findFirst({
      where: { id: analysisId },
    });
    if (ana) {
      ana = convertBigIntToNumberInObject(ana);
    }
    return ana;
  }
}
