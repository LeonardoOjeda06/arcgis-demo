import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsString() @Matches(/^[A-Z_]{1,50}$/)
  action?: string;

  @IsOptional() @IsIn(['ADMIN', 'CLIENT', 'SYSTEM'])
  actorType?: 'ADMIN' | 'CLIENT' | 'SYSTEM';

  @IsOptional() @IsString() @MaxLength(100)
  target?: string;

  @IsOptional() @IsISO8601()
  from?: string;

  @IsOptional() @IsISO8601()
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
