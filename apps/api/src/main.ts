import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Security-hygiene audit fix — explicit JSON body-size limit. 1MB is more
// generous than body-parser's implicit 100kb default (this app already ran
// under that default, unnoticed, until now) specifically so the bulk-JSON
// import endpoints (POST /attendance-raw-logs/bulk, POST
// /attendance-records — arrays with no @ArrayMaxSize) have realistic
// headroom for a few thousand rows, while staying far below the 10MB
// spreadsheet FILE upload limit (SPREADSHEET_MAX_FILE_SIZE_BYTES) — JSON
// payloads and binary file uploads are different risk profiles and don't
// need the same ceiling.
const JSON_BODY_SIZE_LIMIT = '1mb';

async function bootstrap() {
  // bodyParser: false + explicit useBodyParser below, rather than layering a
  // second parser on top of Nest's default one (which would double-parse the
  // request body) — this is the supported way to customize the limit.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: JSON_BODY_SIZE_LIMIT });
  app.useBodyParser('urlencoded', {
    limit: JSON_BODY_SIZE_LIMIT,
    extended: true,
  });
  app.use(helmet());
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
