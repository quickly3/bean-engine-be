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
import { EsService } from 'src/service/es.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule, CommandModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('es'),
      }),
    }),
  ],
  controllers: [
    AppController,
    SearchController,
    AuthorController,
    ArticleController,
    GraphController,
  ],
  providers: [
    AppService,
    SearchService,
    AuthorService,
    ArticleService,
    GraphService,
    EsCommand,
    SyncService,
    EsService,
  ],
})
export class AppModule {}
