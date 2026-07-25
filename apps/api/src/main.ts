import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // B-01 (06_FRONTEND_GENERAL.md §13.5) — apps/web is a separate origin (Vite
  // dev server on :3001) from the API (:3000), so the browser needs CORS.
  // No cookies are issued (auth is a Bearer token in the JSON body, §13.4),
  // so credentials stay disabled.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
