import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    const { page, pageSize } = payload;
    const ups = await this.prisma.biliUps.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'asc' },
    });
    return convertBigIntToNumberInArray(ups);
  }

  @Post('getUpVideos')
  async getUpVideos(@Body() payload: any) {
    const { page, pageSize, mid } = payload;
    const videos = await this.prisma.biliArchive.findMany({
      where: { mid },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'asc' },
    });
    return convertBigIntToNumberInArray(videos);
  }
}
