# Compila el iframe y lo sirve con Nginx. map-embed-sdk debe estar publicado en el registro interno
# (o copiado junto a este repo) para que pnpm lo instale.
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL
ARG VITE_ARCGIS_BASEMAP_KEY
RUN pnpm build

FROM nginx:1.29-alpine
# Variables que se sustituyen en la plantilla al arrancar el contenedor:
#   API_ORIGIN   ej. https://api-mapas.tuorg.com
#   MAP_API_INTERNAL ej. http://map-api:3000  (red interna, para frame-policy)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
