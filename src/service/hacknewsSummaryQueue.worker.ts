import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { HackNewsSummaryQueueService } from './hacknewsSummaryQueue.service';

/**
 * 服务端队列消费者：定期从 HackNewsSummaryJob 表中取出待执行 job 并处理
 */
@Injectable()
export class HackNewsSummaryQueueWorker {
  private busy = false;

  constructor(private readonly queueService: HackNewsSummaryQueueService) {}

  @Interval(5000)
  async tick() {
    if (this.busy) {
      return;
    }

    this.busy = true;
    try {
      await this.queueService.processNext();
    } finally {
      this.busy = false;
    }
  }
}
