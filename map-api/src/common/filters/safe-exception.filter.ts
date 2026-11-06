import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

/** Devuelve mensajes genéricos al cliente y deja el detalle solo en el log del servidor. */
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('Errors');

  catch(err: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = randomUUID();

    if (err instanceof HttpException) {
      const status = err.getStatus();
      const body = err.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? err.message);
      if (status >= 500) this.log.warn(`${requestId} ${status} ${err.message}`);
      return res.status(status).json({ statusCode: status, requestId, message });
    }

    // Solo nombre y stack: nunca el objeto completo (podría traer datos de la petición).
    const e = err instanceof Error ? err : new Error(String(err));
    this.log.error(`${requestId} ${e.name}: ${e.message}`, e.stack);
    res.status(500).json({ statusCode: 500, requestId, message: 'Error interno' });
  }
}
