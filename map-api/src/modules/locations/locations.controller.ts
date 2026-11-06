import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { EmbedAuthGuard } from '../../common/guards/embed-auth.guard.js';
import { ScopesGuard } from '../../common/guards/scopes.guard.js';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator.js';
import { EmbedSession } from '../../common/decorators/embed-session.decorator.js';
import type { EmbedClaims } from '../../common/types.js';
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';

@Controller('locations')
@UseGuards(EmbedAuthGuard, ScopesGuard) // el orden importa: primero autenticar
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @RequireScopes('location:write')
  create(@EmbedSession() s: EmbedClaims, @Body() dto: CreateLocationDto) {
    return this.service.create(s, dto);
  }

  @Get('mine')
  @RequireScopes('location:read')
  mine(@EmbedSession() s: EmbedClaims) {
    return this.service.findMine(s);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireScopes('location:write')
  remove(@EmbedSession() s: EmbedClaims, @Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(s, id);
  }
}
