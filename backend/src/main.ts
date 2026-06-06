import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { setupSession } from './session/session.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  setupSession(app);
  setupApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
