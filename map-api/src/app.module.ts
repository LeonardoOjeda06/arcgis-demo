import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { type Env, validateEnv } from './config/env.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { ClientAppsModule } from './modules/client-apps/client-apps.module.js';
import { EmbedSessionModule } from './modules/embed-session/embed-session.module.js';
import { LocationsModule } from './modules/locations/locations.module.js';
import { RoutingModule } from './modules/routing/routing.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) => ({
        type: 'oracle',
        username: cfg.get('DB_USER', { infer: true }),
        password: cfg.get('DB_PASSWORD', { infer: true }),
        connectString: cfg.get('DB_CONNECT_STRING', { infer: true }),
        schema: cfg.get('DB_SCHEMA', { infer: true }) || undefined, // ej. MAP_OWNER
        autoLoadEntities: true,
        synchronize: false, // NUNCA true: el esquema cambia solo por scripts SQL versionados
        migrationsRun: false,
        logging: ['error'], // no loguear SQL con datos personales
        extra: { poolMin: 2, poolMax: 10 },
        retryAttempts: 3,
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]), // 120 peticiones/min por IP

    AuditModule,
    ClientAppsModule,
    EmbedSessionModule,
    LocationsModule,
    RoutingModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
