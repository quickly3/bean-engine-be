import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { PromptsService } from 'src/service/ai/prompts.service';

@Injectable()
export class AiCommand {
  constructor(private readonly promptsService: PromptsService) {}
  @Command({
    command: 'ai:prompts-cn',
  })
  async syncPromptCn() {
    await this.promptsService.syncPromptCn();
  }
}
