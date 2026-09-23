#!/usr/bin/env bash
# Despliegue de Aurora+ — se ejecuta EN EL SERVIDOR, dentro de la carpeta del
# stack que se quiere actualizar (/opt/aurora/production o /opt/aurora/staging).
#
#   ./deploy.sh              actualiza al último commit de la rama actual
#   ./deploy.sh --no-pull    reconstruye con el código que ya está en disco
#   ./deploy.sh --rama X     cambia a la rama X y despliega esa
#
# Qué hace, en orden: respalda la base ANTES de tocar nada, trae el código,
# reconstruye las imágenes, levanta, y espera a que todo quede sano. Si algo
# falla, corta de inmediato y deja el respaldo hecho para poder volver atrás.
set -euo pipefail

cd "$(dirname "$0")"

PULL=true
RAMA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-pull) PULL=false ;;
    --rama) RAMA="${2:?--rama necesita el nombre de la rama}"; shift ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
  shift
done

if [ ! -f .env ]; then
  echo "ERROR: no hay .env en $(pwd). Copiar .env.example a .env y llenarlo primero."
  exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.env; set +a
STACK_NAME="${STACK_NAME:-aurora-prod}"

# Perfil "edge": solo el stack de producción levanta Caddy (puertos 80/443).
PERFILES=()
if [ "$STACK_NAME" = "aurora-prod" ]; then
  PERFILES=(--profile edge)
fi

echo "==> Stack: $STACK_NAME  |  Dominio: ${DOMAIN:-localhost}"

# La red compartida entre producción y pruebas es "external" en el compose:
# hay que crearla una vez, y este es el lugar donde no se olvida.
if ! docker network inspect aurora_edge >/dev/null 2>&1; then
  echo "==> Creando la red compartida aurora_edge"
  docker network create aurora_edge
fi

# --- 1. Respaldo previo -----------------------------------------------------
# Antes de reconstruir nada: si la migración de Flyway de este despliegue sale
# mal, este archivo es la única forma de volver al estado anterior.
if docker compose ps --status running --services 2>/dev/null | grep -qx db; then
  mkdir -p backups
  ARCHIVO="backups/pre-deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
  echo "==> Respaldo previo -> $ARCHIVO"
  docker compose exec -T db pg_dump -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-auroraplus_db}" | gzip > "$ARCHIVO"
  echo "    $(du -h "$ARCHIVO" | cut -f1)"
else
  echo "==> (primer despliegue: no hay base corriendo que respaldar)"
fi

# --- 2. Código --------------------------------------------------------------
if [ -n "$RAMA" ]; then
  echo "==> Cambiando a la rama $RAMA"
  git fetch --all --prune
  git checkout "$RAMA"
fi

if [ "$PULL" = true ]; then
  echo "==> Trayendo el último código"
  git pull --ff-only
fi
echo "    commit: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# --- 3. Build ---------------------------------------------------------------
# Se construye ANTES de bajar nada: si el build falla, la versión vieja sigue
# atendiendo usuarios sin haberse interrumpido.
echo "==> Construyendo imágenes (backend + frontend)"
docker compose "${PERFILES[@]}" build

# --- 4. Levantar ------------------------------------------------------------
echo "==> Levantando servicios"
docker compose "${PERFILES[@]}" up -d --remove-orphans

# --- 5. Esperar a que quede sano -------------------------------------------
# Flyway corre al arrancar el backend: acá es donde se ve si una migración
# rompió algo, en vez de enterarse por un cliente.
echo "==> Esperando a que el backend quede sano (hasta 4 minutos)"
INTENTOS=48
until [ "$(docker compose ps app --format '{{.Health}}' 2>/dev/null)" = "healthy" ]; do
  INTENTOS=$((INTENTOS - 1))
  if [ "$INTENTOS" -le 0 ]; then
    echo "ERROR: el backend no quedó sano. Últimas 60 líneas del log:"
    docker compose logs --tail 60 app
    echo
    echo "El respaldo previo quedó en backups/ — para volver atrás:"
    echo "  git checkout <commit-anterior> && ./deploy.sh --no-pull"
    echo "  ./docker/backup/restore.sh <ese respaldo>   # solo si la migración corrompió datos"
    exit 1
  fi
  sleep 5
done

echo "==> Backend sano."
docker compose "${PERFILES[@]}" ps

# --- 6. Limpieza ------------------------------------------------------------
# Las imágenes viejas de cada despliegue llenan el disco del VPS en pocas
# semanas. Se borran solo las que ya no usa ningún contenedor.
echo "==> Limpiando imágenes sin usar"
docker image prune -f >/dev/null

echo
echo "Listo. Verificar a mano:  https://${DOMAIN:-localhost}"
echo "Logs en vivo:             docker compose logs -f app"
