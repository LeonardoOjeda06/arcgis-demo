import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { SCOPES, type Scope } from '../../../common/scopes.js';
import { isExactOrigin } from '../../../common/utils/origin.js';

@ValidatorConstraint({ name: 'exactOrigin' })
class ExactOriginConstraint implements ValidatorConstraintInterface {
  validate(values: unknown) {
    return Array.isArray(values) && values.every((v) => typeof v === 'string' && isExactOrigin(v));
  }
  defaultMessage() {
    return 'Cada origen debe ser exacto (https://dominio[:puerto], sin ruta ni / final; http solo para localhost)';
  }
}

export class CreateClientAppDto {
  @IsString() @Length(3, 150)
  name!: string;

  /** Opcional: si no se envía, se genera a partir del nombre. */
  @IsOptional() @IsString() @Matches(/^[a-z0-9][a-z0-9-]{2,63}$/, { message: 'clientId: minúsculas, números y guiones (3-64)' })
  clientId?: string;

  @IsArray() @ArrayMaxSize(20) @ArrayUnique() @Validate(ExactOriginConstraint)
  origins!: string[];

  @IsArray() @ArrayUnique() @IsIn(SCOPES, { each: true })
  permissions!: Scope[];
}

export class SetPermissionsDto {
  @IsArray() @ArrayUnique() @IsIn(SCOPES, { each: true })
  permissions!: Scope[];
}

export class SetOriginsDto {
  @IsArray() @ArrayMaxSize(20) @ArrayUnique() @Validate(ExactOriginConstraint)
  origins!: string[];
}

export class SetStatusDto {
  @IsIn(['ACTIVE', 'DISABLED'])
  status!: 'ACTIVE' | 'DISABLED';
}
