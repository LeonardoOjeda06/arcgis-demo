import { Module } from '@nestjs/common';
import { ArcgisModule } from '../arcgis/arcgis.module.js';
import { RoutingController } from './routing.controller.js';

@Module({
  imports: [ArcgisModule],
  controllers: [RoutingController],
})
export class RoutingModule {}
