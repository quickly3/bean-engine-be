import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import _ from 'lodash';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  convertBigIntToNumberInArray,
  convertBigIntToNumberInObject,
} from 'src/service/bili/bili-util';

@ApiTags('bili')
@Controller('bili')
export class BiliController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('getUps')
  @ApiOperation({ summary: '获取 B 站 UP 主列表' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        page: { type: 'number', example: 1 },
        pageSize: { type: 'number', example: 20 },
        keywords: { type: 'string' },
        sortBy: { type: 'string', example: 'lastPublish' },
      },
      required: ['page', 'pageSize', 'sortBy'],
    },
  })
  @ApiOkResponse({ description: 'UP 主分页数据' })
  async getUps(@Body() payload: any) {
    const { page, pageSize, keywords, sortBy } = payload;

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
        ORDER BY ${Prisma.raw(sortBy)} desc
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
  @ApiOperation({ summary: '获取 UP 主视频列表' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        page: { type: 'number', example: 1 },
        pageSize: { type: 'number', example: 20 },
        mid: { type: 'string', description: 'UP 主 mid' },
      },
      required: ['page', 'pageSize', 'mid'],
    },
  })
  @ApiOkResponse({ description: 'UP 主视频分页数据' })
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
  @ApiOperation({ summary: '获取 UP 主分析数据' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        analysisId: { type: 'number', description: '分析记录 ID' },
      },
      required: ['analysisId'],
    },
  })
  @ApiOkResponse({ description: 'UP 主分析结果' })
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
