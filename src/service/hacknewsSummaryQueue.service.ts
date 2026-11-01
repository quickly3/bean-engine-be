import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HackerNewsService } from './hackerNews.service';

export enum HackNewsSummaryJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Injectable()
export class HackNewsSummaryQueueService {
  private readonly logger = new Logger(HackNewsSummaryQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hackerNewsService: HackerNewsService,
  ) {}

  /**
   * 入队：job 内容为 hackNews.id
   * 同一个 hackNewsId 重复入队时，先删除该 id 之前的历史任务记录
   */
  async enqueue(hackNewsId: number) {
    const { count } = await this.prisma.hackNewsSummaryJob.deleteMany({
      where: {
        hackNewsId,
        // 正在执行的 job 保留，避免 worker 更新状态时记录已被删除
        status: { not: HackNewsSummaryJobStatus.PROCESSING },
      },
    });
    if (count > 0) {
      this.logger.log(
        `已删除 hackNewsId=${hackNewsId} 的历史任务记录 ${count} 条`,
      );
    }

    const job = await this.prisma.hackNewsSummaryJob.create({
      data: { hackNewsId },
    });
    this.logger.log(`任务已入队: job=${job.id}, hackNewsId=${hackNewsId}`);
    return job;
  }

  async getJob(id: string) {
    return this.prisma.hackNewsSummaryJob.findUnique({ where: { id } });
  }

  /**
   * 取出下一个待执行 job，并通过条件更新保证同一条 job 只被一个 worker 抢占
   */
  private async claimNext() {
    const job = await this.prisma.hackNewsSummaryJob.findFirst({
      where: { status: HackNewsSummaryJobStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) {
      return null;
    }

    const { count } = await this.prisma.hackNewsSummaryJob.updateMany({
      where: { id: job.id, status: HackNewsSummaryJobStatus.PENDING },
      data: {
        status: HackNewsSummaryJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    return count > 0 ? job : null;
  }

  /**
   * 取出并执行一个 job，返回是否执行了任务
   */
  async processNext(): Promise<boolean> {
    const job = await this.claimNext();
    if (!job) {
      return false;
    }

    await this.run(job.id, job.hackNewsId);
    return true;
  }

  /**
   * 执行 job：调用 HackerNews 抓取正文并生成中文摘要，同时更新运行状态
   */
  private async run(jobId: string, hackNewsId: number) {
    this.logger.log(`开始执行任务: job=${jobId}, hackNewsId=${hackNewsId}`);

    try {
      const resp =
        await this.hackerNewsService.fetchContentAndSummarize(hackNewsId);

      await this.prisma.hackNewsSummaryJob.update({
        where: { id: jobId },
        data: {
          status: HackNewsSummaryJobStatus.SUCCESS,
          result: { contentLength: resp.contentLength },
          error: null,
          finishedAt: new Date(),
        },
      });

      this.logger.log(`任务执行成功: job=${jobId}, hackNewsId=${hackNewsId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.hackNewsSummaryJob.update({
        where: { id: jobId },
        data: {
          status: HackNewsSummaryJobStatus.FAILED,
          error: message.slice(0, 2000),
          finishedAt: new Date(),
        },
      });

      this.logger.error(
        `任务执行失败: job=${jobId}, hackNewsId=${hackNewsId}, ${message}`,
      );
    }
  }
}
