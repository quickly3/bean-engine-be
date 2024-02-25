import { Module } from '@nestjs/common';
import { AppController } from '../controller/app.controller';
import { AppService } from '../service/app.service';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config';
import { SearchService } from 'src/service/search.service';
import { SearchController } from 'src/controller/search.controller';
import { AuthorController } from 'src/controller/author.controller';
import { AuthorService } from 'src/service/author.service';
import { ArticleService } from 'src/service/article.service';
import { ArticleController } from 'src/controller/article.controller';
import { GraphController } from 'src/controller/graph.controller';
import { GraphService } from 'src/service/graph.service';
import { CommandModule } from 'nestjs-command';
import { EsCommand } from 'src/commands/es.command';
import { SyncService } from 'src/service/sync.sevice';
import { PromptsService } from 'src/service/ai/prompts.service';
import { AiCommand } from 'src/commands/ai.command';
import { ScheduleModule } from '@nestjs/schedule';
import { SpiderController } from 'src/controller/spider.controller';

// import { EsService } from 'src/service/es.service';
// import { JuejinNeoService } from 'src/service/juejinNeo.service';
// import { Neo4jModule } from 'nest-neo4j';

@Module({
  imports: [
    CommandModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('es'),
      }),
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    SearchController,
    AuthorController,
    ArticleController,
    GraphController,
    SpiderController,
  ],
  providers: [
    AppService,
    SearchService,
    AuthorService,
    ArticleService,
    GraphService,
    EsCommand,
    AiCommand,
    SyncService,
    PromptsService,
    // EsService,
    // JuejinNeoService,
  ],
})
export class AppModule {}
