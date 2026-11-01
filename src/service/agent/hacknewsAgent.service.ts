import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeepSeekService } from 'src/service/ai/deepseek.service';
import { HackerNewsService } from 'src/service/hackerNews.service';
import { HACKNEWS_AGENT_PROMPT } from 'src/prompts/hacknews-agent.prompt';

/** Agent 单次决策的解析结果 */
interface AgentDecision {
  thought: string;
  action: string;
  action_input?: Record<string, any>;
  final_answer?: string;
}

/** Agent 执行结果 */
export interface AgentRunResult {
  success: boolean;
  steps: Array<{ thought: string; action: string; observation: string }>;
  finalAnswer: string;
}

/** Agent 最大决策轮数，防止死循环 */
const MAX_STEPS = 12;

@Injectable()
export class HacknewsAgentService {
  private readonly logger = new Logger(HacknewsAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepSeekService: DeepSeekService,
    private readonly hackerNewsService: HackerNewsService,
  ) {}

  /**
   * Agent 主入口：ReAct 循环
   * 每轮将历史（thought/action/observation）拼接进 prompt，
   * 由 LLM 决定下一个工具调用，直到 action === 'finish' 或达到最大轮数。
   */
  async run(goal: string): Promise<AgentRunResult> {
    this.logger.log(`Agent 启动，任务目标: ${goal}`);

    const steps: AgentRunResult['steps'] = [];
    const history: string[] = [
      `目标: ${goal}`,
      `今天是 ${moment().format('YYYY-MM-DD')}。请开始规划并执行。`,
    ];

    for (let i = 0; i < MAX_STEPS; i++) {
      const decision = await this.think(history.join('\n'));

      if (!decision) {
        steps.push({
          thought: 'LLM 输出无法解析为合法 JSON',
          action: 'parse_error',
          observation: '终止执行',
        });
        break;
      }

      this.logger.log(
        `[Step ${i + 1}] thought: ${decision.thought} | action: ${decision.action}`,
      );

      if (decision.action === 'finish') {
        steps.push({
          thought: decision.thought,
          action: 'finish',
          observation: decision.final_answer || '任务完成',
        });
        return {
          success: true,
          steps,
          finalAnswer: decision.final_answer || decision.thought,
        };
      }

      const observation = await this.executeTool(
        decision.action,
        decision.action_input || {},
      );

      steps.push({
        thought: decision.thought,
        action: decision.action,
        observation,
      });
      history.push(
        `Thought: ${decision.thought}`,
        `Action: ${decision.action}`,
        `Action Input: ${JSON.stringify(decision.action_input || {})}`,
        `Observation: ${observation}`,
      );
    }

    return {
      success: false,
      steps,
      finalAnswer: `已达到最大执行轮数（${MAX_STEPS}），提前终止。已完成步骤: ${steps.length}`,
    };
  }

  /** 调用 LLM 进行单轮决策，解析输出 JSON */
  private async think(context: string): Promise<AgentDecision | null> {
    const resp = await this.deepSeekService.chatWithSystem({
      system: HACKNEWS_AGENT_PROMPT,
      message: context,
      type: 'pro',
    });

    return this.parseDecision(resp);
  }

  /** 从 LLM 输出中提取 JSON 决策，容忍 markdown 代码块包裹 */
  private parseDecision(raw: string): AgentDecision | null {
    if (!raw) return null;

    const cleaned = raw
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // 优先尝试整体解析
    try {
      return this.validateDecision(JSON.parse(cleaned));
    } catch {
      // 继续尝试提取首个 JSON 对象
    }

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return this.validateDecision(JSON.parse(match[0]));
      } catch {
        return null;
      }
    }
    return null;
  }

  private validateDecision(obj: any): AgentDecision | null {
    if (!obj || typeof obj.action !== 'string') return null;
    return {
      thought: typeof obj.thought === 'string' ? obj.thought : '',
      action: obj.action,
      action_input:
        obj.action_input && typeof obj.action_input === 'object'
          ? obj.action_input
          : {},
      final_answer:
        typeof obj.final_answer === 'string' ? obj.final_answer : undefined,
    };
  }

  /** 工具注册表：Agent 可调用的全部能力 */
  private async executeTool(
    action: string,
    input: Record<string, any>,
  ): Promise<string> {
    switch (action) {
      case 'check_db_status':
        return this.toolCheckDbStatus();
      case 'fetch_new_stories':
        return this.toolFetchNewStories();
      case 'translate_records':
        return this.toolTranslateRecords();
      case 'categorize_records':
        return this.toolCategorizeRecords();
      case 'query_news_by_date':
        return this.toolQueryNewsByDate(input.date);
      case 'generate_ai_daily_report':
        return this.toolGenerateAiDailyReport(input.date);
      default:
        return `未知工具: ${action}，请从可用工具列表中选择`;
    }
  }

  /** 查询数据库各状态记录数量 */
  private async toolCheckDbStatus(): Promise<string> {
    const grouped = await this.prisma.hackNews.groupBy({
      by: ['state'],
      _count: { _all: true },
    });
    const status = grouped
      .map((g) => `${g.state ?? 'null'}: ${g._count._all}`)
      .join(', ');
    return `数据库记录状态统计 -> ${status || '无记录'}`;
  }

  /** 拉取 HackerNews 最新新闻入库 */
  private async toolFetchNewStories(): Promise<string> {
    const ids = await this.hackerNewsService.getNewStories2();
    return `新入库 ${ids.length} 条 HackerNews 记录（ID 已自动跳过已存在记录）`;
  }

  /** 翻译 pending 记录 */
  private async toolTranslateRecords(): Promise<string> {
    await this.hackerNewsService.transRecords();
    return '翻译任务已执行完成，可调用 check_db_status 验证 pending 是否清零';
  }

  /** 分类 translated 记录 */
  private async toolCategorizeRecords(): Promise<string> {
    await this.hackerNewsService.cateRecords();
    return '分类任务已执行完成，可调用 check_db_status 验证 translated 是否清零';
  }

  /** 查询指定日期已分类新闻（默认昨天） */
  private async toolQueryNewsByDate(date?: string): Promise<string> {
    const targetDate = date || moment().subtract(1, 'day').format('YYYY-MM-DD');
    const news = await this.hackerNewsService.getAiNewsByDate(
      targetDate,
      null,
      null,
    );
    const preview = news
      .slice(0, 10)
      .map(
        (n) =>
          `- [${n.category}/${n.level}] ${n.title_cn || n.title} -> ${n.url}`,
      )
      .join('\n');
    return `日期 ${targetDate} 共 ${news.length} 条已分类新闻。前 10 条预览:\n${preview}`;
  }

  /** 生成 AI 主题每日报告 */
  private async toolGenerateAiDailyReport(date?: string): Promise<string> {
    const targetDate = date || moment().subtract(1, 'day').format('YYYY-MM-DD');
    const result =
      await this.hackerNewsService.generateAiDailyReportMd(targetDate);
    return `日报生成完成: 日期=${result.date}, 新闻数量=${result.total}, 文件路径=${result.filePath}`;
  }
}
