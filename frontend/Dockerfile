# Imagen del FRONTEND (SPA React/Vite) — hasta ahora inexistente: el stack de
# Docker solo construía el backend, así que en el servidor se habría servido el
# HTML viejo de src/main/resources/static, no la aplicación real.
#
# OJO: el contexto de build es la RAÍZ del repo (ver docker-compose.yml), no
# frontend/ — porque la configuración del servidor estático vive en docker/web.

# --- Etapa 1: compilación del bundle ---
FROM node:22-alpine AS build
WORKDIR /app/frontend

# Primero solo los manifiestos, para que Docker cachee node_modules y no
# reinstale todo en cada despliegue si las dependencias no cambiaron.
COPY frontend/package.json frontend/package-lock.json ./
# "npm ci" exige que el lock esté sincronizado con package.json; si no lo está
# (pasa cuando se agrega una dependencia a mano), se cae a "npm install" en vez
# de romper el despliegue entero.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY frontend/ ./

# El DSN de Sentry del FRONTEND se incrusta en el bundle al compilar (Vite
# reemplaza import.meta.env en tiempo de build), no se lee en el servidor: por
# eso entra como build-arg y no como variable de entorno del contenedor.
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

# --- Etapa 2: servidor estático ---
# Solo el bundle ya compilado + Caddy: sin Node, sin node_modules, sin código
# fuente en el servidor.
FROM caddy:2-alpine
COPY --from=build /app/frontend/dist /srv
COPY docker/web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
