import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsLatitude() latitude!: number;
  @IsLongitude() longitude!: number;

  @IsString() @IsNotEmpty() @MaxLength(250)
  address!: string;

  @IsOptional() @IsString() @MaxLength(100)
  label?: string;
}
