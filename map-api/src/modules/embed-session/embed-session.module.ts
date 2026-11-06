import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmbedSessionController } from './embed-session.controller.js';
import { FramePolicyController } from './frame-policy.controller.js';
import { EmbedSessionService } from './embed-session.service.js';
import type { Env } from '../../config/env.js';

@Module({
  imports: [
    // Global: EmbedAuthGuard verifica tokens desde los módulos de ubicaciones y rutas.
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) => ({
        secret: cfg.get('EMBED_JWT_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] }, // fija el algoritmo: evita el ataque "alg: none"
      }),
    }),
  ],
  controllers: [EmbedSessionController, FramePolicyController],
  providers: [EmbedSessionService],
})
export class EmbedSessionModule {}
