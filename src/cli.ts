import { CommandFactory } from 'nest-commander';
import { CliModule } from './modules/cli.module';

async function bootstrap() {
  try {
    await CommandFactory.run(CliModule, {
      errorHandler: (err) => {
        console.error(err);
        process.exit(1);
      },
    });
  } catch (err) {
    console.error('CLI 启动失败:', err);
    process.exit(1);
  }
}

bootstrap();
