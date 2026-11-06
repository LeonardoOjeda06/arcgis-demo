import { BadGatewayException, Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { EmbedAuthGuard } from '../../common/guards/embed-auth.guard.js';
import { ScopesGuard } from '../../common/guards/scopes.guard.js';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator.js';
import { ArcgisClient } from '../arcgis/arcgis.client.js';
import { GeocodeQuery, ReverseQuery, RouteDto } from './dto/routing.dto.js';

@Controller()
@UseGuards(EmbedAuthGuard, ScopesGuard)
export class RoutingController {
  constructor(private readonly arcgis: ArcgisClient) {}

  @Post('routes')
  @HttpCode(200)
  @RequireScopes('route:calculate')
  async route(@Body() dto: RouteDto) {
    const data = await this.arcgis.solveRoute(dto.stops);
    const r = data.routes?.features?.[0];
    if (!r?.geometry) throw new BadGatewayException('No se pudo calcular la ruta');
    // Devolvemos solo lo que el iframe necesita, no la respuesta cruda de ArcGIS.
    return {
      distanceKm: Number((r.attributes.Total_Kilometers ?? 0).toFixed(2)),
      minutes: Math.round(r.attributes.Total_TravelTime ?? r.attributes.Total_Minutes ?? 0),
      path: r.geometry.paths,
      directions: data.directions?.[0]?.features?.map((f) => f.attributes.text) ?? [],
    };
  }

  @Get('geocode')
  @RequireScopes('geocode:search')
  async geocode(@Query() { q }: GeocodeQuery) {
    const data = await this.arcgis.geocode(q);
    return (data.candidates ?? []).map((c) => ({
      address: c.address,
      latitude: c.location.y,
      longitude: c.location.x,
      score: c.score,
    }));
  }

  /** Dirección aproximada de un punto marcado en el mapa. */
  @Get('geocode/reverse')
  @RequireScopes('geocode:search')
  async reverse(@Query() { lat, lng }: ReverseQuery) {
    const data = await this.arcgis.reverseGeocode({ latitude: lat, longitude: lng });
    return { address: data.address?.LongLabel ?? data.address?.Match_addr ?? null };
  }
}
