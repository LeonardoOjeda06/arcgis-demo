import { Module } from '@nestjs/common';
import { ArcgisClient } from './arcgis.client.js';

@Module({
  providers: [ArcgisClient],
  exports: [ArcgisClient],
})
export class ArcgisModule {}
