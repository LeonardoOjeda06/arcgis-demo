import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientApp } from './entities/client-app.entity.js';
import { ClientOrigin } from './entities/client-origin.entity.js';
import { ClientPermission } from './entities/client-permission.entity.js';
import { Permission } from './entities/permission.entity.js';
import { ClientAppsService } from './client-apps.service.js';
import { ClientAppsAdminService } from './client-apps.admin.service.js';
import { ClientAppsAdminController } from './client-apps.admin.controller.js';

// Global: EmbedAuthGuard (usado en varios módulos) necesita ClientAppsService.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ClientApp, ClientOrigin, ClientPermission, Permission])],
  controllers: [ClientAppsAdminController],
  providers: [ClientAppsService, ClientAppsAdminService],
  exports: [ClientAppsService],
})
export class ClientAppsModule {}
