import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive().default(3000),
    TRUST_PROXY: bool, // true solo si hay un Nginx/balanceador delante

    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_CONNECT_STRING: z.string().min(1), // host:1521/NOMBRE_SERVICIO
    DB_SCHEMA: z.string().optional(), // ej. MAP_OWNER si las tablas son de otro usuario

    EMBED_JWT_SECRET: z.string().min(32), // node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
    EMBED_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(600),

    EMBED_ORIGIN: z.url(), // origen del iframe (map-embed-web)
    ADMIN_ORIGIN: z.url(), // origen del panel (map-admin-web)

    // 'oidc' = SSO corporativo (producción). 'dev' = token fijo, solo para desarrollo local.
    ADMIN_AUTH_MODE: z.enum(['oidc', 'dev']).default('oidc'),
    ADMIN_DEV_TOKEN: z.string().optional(),
    OIDC_ISSUER: z.string().optional(),
    OIDC_AUDIENCE: z.string().optional(),
    OIDC_JWKS_URI: z.string().optional(), // si se omite, se descubre en /.well-known/openid-configuration
    OIDC_ADMIN_ROLE: z.string().default('MAP_ADMIN'),

    ARCGIS_SERVER_API_KEY: z.string().min(1),
    ARCGIS_COUNTRY_CODE: z.string().length(3).default('COL'),
    ARCGIS_GEOCODE_FOR_STORAGE: bool, // ver "Términos de ArcGIS" en la guía (P0)
  })
  .superRefine((env, ctx) => {
    if (env.ADMIN_AUTH_MODE === 'dev') {
      if (env.NODE_ENV === 'production') {
        ctx.addIssue({ code: 'custom', path: ['ADMIN_AUTH_MODE'], message: "'dev' no está permitido en producción" });
      }
      if (!env.ADMIN_DEV_TOKEN || env.ADMIN_DEV_TOKEN.length < 32) {
        ctx.addIssue({ code: 'custom', path: ['ADMIN_DEV_TOKEN'], message: 'requerido (mínimo 32 caracteres) con ADMIN_AUTH_MODE=dev' });
      }
    } else {
      if (!env.OIDC_ISSUER || !z.url().safeParse(env.OIDC_ISSUER).success) {
        ctx.addIssue({ code: 'custom', path: ['OIDC_ISSUER'], message: 'URL requerida con ADMIN_AUTH_MODE=oidc' });
      }
      if (!env.OIDC_AUDIENCE) {
        ctx.addIssue({ code: 'custom', path: ['OIDC_AUDIENCE'], message: 'requerido con ADMIN_AUTH_MODE=oidc' });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Valida process.env y, si algo falla, muestra un mensaje legible y detiene el arranque. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Variables de entorno inválidas:\n${lines.join('\n')}`);
  }
  return parsed.data;
}
