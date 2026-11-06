# Mapa ArcGIS embebible con permisos por aplicación

Implementación de la guía *Guia-Map-Embed-ArcGIS.pdf*. Son cuatro proyectos independientes y una app de demostración:

| Carpeta | Qué es | Puerto local |
|---|---|---|
| `map-api/` | Backend NestJS + Oracle: tokens del iframe, permisos, ubicaciones, proxy a ArcGIS, auditoría | 3000 |
| `map-embed-web/` | Página del iframe (React + ArcGIS). También publica el SDK en `/sdk/` | 5173 |
| `map-admin-web/` | Panel administrativo (apps, permisos, orígenes, secretos, auditoría) | 5174 |
| `map-embed-sdk/` | Librería de ~2 KB que crea el iframe y maneja `postMessage` | — |
| `demo-host/` | App cliente de prueba: hace de "backend del cliente" y muestra cómo se integra | 5175 |

## Puesta en marcha (desarrollo)

### 1. Base de datos (Oracle 19c)
1. Ejecuta `map-api/database/V001__map_embed_schema.sql` con el usuario dueño (`MAP_OWNER`).
2. En `map-api/.env` completa `DB_PASSWORD` y revisa `DB_USER` / `DB_CONNECT_STRING`.
3. Si las tablas son de `MAP_OWNER` y Nest se conecta como `MAP_APP`, pon `DB_SCHEMA=MAP_OWNER` (o crea los sinónimos que están al final del script).
4. Registra la app de demostración ejecutando `demo-host/seed-demo-app.sql` (ya trae el hash del secreto que está en `demo-host/.env`).

### 2. Arrancar todo (una terminal por proyecto)
```powershell
cd map-embed-sdk;  pnpm build          # una vez (y cada vez que cambies el SDK)
cd map-api;        pnpm start:dev      # http://localhost:3000/api/v1/health
cd map-embed-web;  pnpm dev            # iframe
cd map-admin-web;  pnpm dev            # panel
cd demo-host;      pnpm dev            # abre http://localhost:5175
```

En `http://localhost:5175` deberías ver el mapa, poder guardar una residencia (el formulario de la derecha se llena solo) y calcular rutas.

### 3. Panel administrativo
Mientras no haya SSO, `map-api/.env` usa `ADMIN_AUTH_MODE=dev`. Entra a `http://localhost:5174` y pega el valor de `ADMIN_DEV_TOKEN` de `map-api/.env`. Ese modo **no arranca** con `NODE_ENV=production`.

Para usar el SSO: en `map-api/.env` pon `ADMIN_AUTH_MODE=oidc`, `OIDC_ISSUER`, `OIDC_AUDIENCE` (y `OIDC_ADMIN_ROLE` si tu rol no se llama `MAP_ADMIN`). En `map-admin-web/.env` pon `VITE_ADMIN_AUTH_MODE=oidc`, `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID` y `VITE_OIDC_SCOPE`. La URL de retorno a registrar en el SSO es `http://localhost:5174/callback`.

### 4. Registrar más apps cliente
- Desde el panel (botón "Nueva aplicación"), o
- sin panel: `cd map-api; pnpm new-app "Nombre" https://origen.exacto [permisos,separados,por,coma]` imprime el SQL y el secreto.

## Llaves de ArcGIS
- `map-api/.env` → `ARCGIS_SERVER_API_KEY`: llave de servidor con *Routing* y *Geocoding*. Nunca llega al navegador.
- `map-embed-web/.env` → `VITE_ARCGIS_BASEMAP_KEY`: llave pública solo con *Basemaps*, restringida por *referrer* al dominio del iframe. **Si está vacía, en desarrollo se usa OpenStreetMap** para no bloquearte; en producción configúrala.
- Si vas a **guardar** en Oracle resultados del geocodificador, los términos de ArcGIS exigen `forStorage=true` (`ARCGIS_GEOCODE_FOR_STORAGE=true`, tiene otro costo).

## Pruebas
```powershell
cd map-api; pnpm test; pnpm test:e2e; pnpm lint
cd map-embed-web; pnpm build; pnpm lint
cd map-admin-web; pnpm build; pnpm lint
```
Las e2e de `map-api` levantan la capa HTTP real (guards, validación, CORS) con Oracle y ArcGIS simulados: verifican 401/403, IDOR entre usuarios, campos extra → 400, app desactivada y que ningún endpoint quede abierto por olvido.

## Diferencias con la guía (y por qué)
- **`Referrer-Policy: strict-origin` en el iframe** en vez de `no-referrer`: la llave de mapa base está restringida por *referrer*; sin cabecera `Referer`, ArcGIS (y OpenStreetMap) rechazan las teselas. `strict-origin` envía solo el origen del iframe, que es público.
- **`GRANT SELECT` en `ME_AUDIT_LOG`**: la pantalla "Auditoría" lo necesita. Sigue sin `UPDATE`/`DELETE`.
- **Permisos y orígenes como tablas explícitas** (no `ManyToMany` con cascada): así TypeORM solo hace `INSERT`/`DELETE` en esas tablas, que es justo lo que permite el usuario `MAP_APP`.
- **Tiempo constante en `/embed/sessions`**: si el `client_id` no existe, igual se verifica un hash argon2 para no revelar qué ids son válidos.
- **Login de desarrollo del panel** (`ADMIN_AUTH_MODE=dev`) para poder trabajar antes de tener SSO; bloqueado en producción.
- **Geocodificación inversa** (`GET /geocode/reverse`): al hacer clic en el mapa se propone la dirección del punto.

## Producción (P8)
Cada proyecto trae `Dockerfile`. `map-embed-web/nginx.conf.template` arma `frame-ancestors` dinámico consultando `map-api` (`/_frame_policy`, solo red interna). Variables del contenedor Nginx: `API_ORIGIN`, `MAP_API_INTERNAL` (iframe) y `API_ORIGIN`, `OIDC_ORIGIN` (panel). Revisa el checklist de seguridad (sección 9 de la guía) antes de salir.
