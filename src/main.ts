import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 요청 DTO에 맞지 않는 데이터는 모두 쳐냄
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 모바일만 하는 경우, CORS 설정 불필요
  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
