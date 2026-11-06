import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { SafeExceptionFilter } from './common/filters/safe-exception.filter.js';

/** Configuración común de la app (la usan main.ts y las pruebas e2e). */
export function configureApp(app: NestExpressApplication, opts: { corsOrigins: string[]; trustProxy: boolean }) {
  if (opts.trustProxy) app.set('trust proxy', 1); // IP real detrás de Nginx/balanceador
  app.disable('x-powered-by');
  app.use(helmet()); // HSTS, nosniff, etc.
  app.useBodyParser('json', { limit: '20kb' });
  app.setGlobalPrefix('api/v1'); // versionar desde el día 1

  // Solo el iframe y el panel admin llaman desde un navegador.
  // Los backends de las apps cliente llaman servidor a servidor: CORS no aplica.
  app.enableCors({
    origin: opts.corsOrigins.map((o) => new URL(o).origin),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    credentials: false, // usamos Bearer, no cookies
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos que no estén en el DTO
      forbidNonWhitelisted: true, // y si llegan campos extra, error 400
      transform: true,
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
}
