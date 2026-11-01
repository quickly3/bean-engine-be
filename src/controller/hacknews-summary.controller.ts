import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HackNewsSummaryQueueService } from 'src/service/hacknewsSummaryQueue.service';

@ApiTags('hacknews')
@Controller('hacknews')
export class HackNewsSummaryController {
  constructor(
    private readonly hackNewsSummaryQueueService: HackNewsSummaryQueueService,
  ) {}

  @Post('summarize-jobs')
  @ApiOperation({ summary: '创建 HackerNews 摘要任务（写入队列）' })
  @ApiBody({
    description: '摘要任务参数',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'HackerNews 记录 ID',
          example: 12345678,
        },
      },
      required: ['id'],
    },
  })
  @ApiOkResponse({ description: '已入队的 job' })
  async createSummarizeJob(@Body() payload: { id?: number }) {
    const hackNewsId = Number(payload?.id);
    if (!hackNewsId || Number.isNaN(hackNewsId)) {
      throw new BadRequestException('id 不能为空且必须是数字');
    }

    return this.hackNewsSummaryQueueService.enqueue(hackNewsId);
  }
}
