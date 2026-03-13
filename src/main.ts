import './common/config/load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { firebaseAuthMiddleware } from './common/middleware/firebase-auth.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.use(firebaseAuthMiddleware);

  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
