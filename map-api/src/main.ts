import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const cfg = app.get<ConfigService<Env, true>>(ConfigService);

  configureApp(app, {
    corsOrigins: [cfg.get('EMBED_ORIGIN', { infer: true }), cfg.get('ADMIN_ORIGIN', { infer: true })],
    trustProxy: cfg.get('TRUST_PROXY', { infer: true }),
  });
  app.enableShutdownHooks(); // cierra el pool de Oracle limpiamente

  const port = cfg.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`map-api escuchando en http://localhost:${port}/api/v1`);
}
await bootstrap();
