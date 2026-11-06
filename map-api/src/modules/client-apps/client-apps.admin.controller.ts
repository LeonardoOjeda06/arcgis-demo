import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { AdminUserParam, ClientIp } from '../../common/decorators/embed-session.decorator.js';
import type { AdminUser } from '../../common/types.js';
import { ClientAppsAdminService } from './client-apps.admin.service.js';
import { CreateClientAppDto, SetOriginsDto, SetPermissionsDto, SetStatusDto } from './dto/admin.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditQueryDto } from '../audit/dto/audit-query.dto.js';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class ClientAppsAdminController {
  constructor(
    private readonly service: ClientAppsAdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  me(@AdminUserParam() admin: AdminUser) {
    return admin;
  }

  @Get('permissions')
  permissions() {
    return this.service.listPermissions();
  }

  @Get('client-apps')
  list() {
    return this.service.list();
  }

  @Get('client-apps/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post('client-apps')
  create(@Body() dto: CreateClientAppDto, @AdminUserParam() admin: AdminUser, @ClientIp() ip: string | null) {
    return this.service.create(dto, admin, ip);
  }

  @Put('client-apps/:id/permissions')
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPermissionsDto,
    @AdminUserParam() admin: AdminUser,
    @ClientIp() ip: string | null,
  ) {
    return this.service.setPermissions(id, dto.permissions, admin, ip);
  }

  @Put('client-apps/:id/origins')
  setOrigins(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetOriginsDto,
    @AdminUserParam() admin: AdminUser,
    @ClientIp() ip: string | null,
  ) {
    return this.service.setOrigins(id, dto.origins, admin, ip);
  }

  @Post('client-apps/:id/rotate-secret')
  @HttpCode(200)
  rotate(@Param('id', ParseIntPipe) id: number, @AdminUserParam() admin: AdminUser, @ClientIp() ip: string | null) {
    return this.service.rotateSecret(id, admin, ip);
  }

  @Patch('client-apps/:id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetStatusDto,
    @AdminUserParam() admin: AdminUser,
    @ClientIp() ip: string | null,
  ) {
    return this.service.setStatus(id, dto.status, admin, ip);
  }

  @Get('audit')
  auditLog(@Query() q: AuditQueryDto) {
    return this.audit.find(q);
  }
}
