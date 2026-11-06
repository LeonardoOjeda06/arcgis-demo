import { IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class CreateSessionDto {
  /** Origen donde se mostrará el iframe. Debe estar registrado para esa app. */
  @IsUrl({ require_tld: false, protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(255)
  origin!: string;

  /** Identificador OPACO del usuario en la app cliente. Nunca la cédula ni el correo. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,100}$/, { message: 'externalUserId debe ser un identificador opaco de 8 a 100 caracteres [A-Za-z0-9_-]' })
  externalUserId!: string;
}
