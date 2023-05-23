import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(helmet.contentSecurityPolicy());
  app.use(helmet.crossOriginEmbedderPolicy());
  app.use(helmet.crossOriginOpenerPolicy());
  app.use(helmet.crossOriginResourcePolicy());
  app.use(helmet.dnsPrefetchControl());

  app.enableCors({
    origin: 'http://localhost:4200',
  });
  await app.listen(3000);
}
bootstrap();
