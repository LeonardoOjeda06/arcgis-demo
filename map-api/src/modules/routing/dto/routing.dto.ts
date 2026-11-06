import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class StopDto {
  @IsLatitude() latitude!: number;
  @IsLongitude() longitude!: number;
}

export class RouteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(10) // limita costo por petición
  stops!: StopDto[];
}

export class GeocodeQuery {
  @IsString() @Length(3, 200)
  q!: string;
}

export class ReverseQuery {
  @Type(() => Number) @IsLatitude() lat!: number;
  @Type(() => Number) @IsLongitude() lng!: number;
}
