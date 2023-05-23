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

@Module({
  imports: [
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
  ],
  controllers: [AppController, SearchController, AuthorController],
  providers: [AppService, SearchService, AuthorService],
})
export class AppModule {}
