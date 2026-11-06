import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedLocation } from './entities/saved-location.entity.js';
import { LocationsService } from './locations.service.js';
import { LocationsController } from './locations.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([SavedLocation])],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
