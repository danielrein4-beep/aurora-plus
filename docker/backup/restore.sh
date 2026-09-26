#!/bin/bash
# Ejecutar en el HOST de Hetzner (donde corre docker compose), NO dentro de un
# contenedor, desde la carpeta del stack (/opt/aurora/production).
#
# ADVERTENCIA: esto BORRA y REEMPLAZA todos los datos actuales de la base con
# los del respaldo elegido. No hay deshacer — si la base actual tiene datos
# que no están en el respaldo, se pierden. Por eso, antes de borrar, deja un
# respaldo de lo que hay ahora en backups/antes-de-restaurar_*.sql.gz.
#
# Qué hace: detiene la app, respalda lo actual, borra y crea la base vacía,
# carga el respaldo deteniéndose en el primer error y vuelve a levantar la app.
# (Antes cargaba el respaldo ENCIMA de la base existente: cada tabla ya existía
# y psql seguía de largo ante los errores, así que "restauraba" sin restaurar.)
#
# Uso: ./docker/backup/restore.sh backups/auroraplus_20260101_120000.sql.gz
set -euo pipefail

ARCHIVO="${1:-}"
if [ -z "$ARCHIVO" ]; then
  echo "Uso: $0 <ruta-al-archivo-de-respaldo.sql.gz>"
  echo "Respaldos disponibles:"
  ls -lh backups/ 2>/dev/null || echo "(no se encontró la carpeta backups/ — ejecute esto desde la raíz del proyecto)"
  exit 1
fi

if [ ! -f "$ARCHIVO" ]; then
  echo "ERROR: no existe el archivo '$ARCHIVO'"
  exit 1
fi
if ! gzip -t "$ARCHIVO"; then
  echo "ERROR: el archivo '$ARCHIVO' está dañado (gzip -t falló). No se tocó nada."
  exit 1
fi

if [ -f .env ]; then set -a; . ./.env; set +a; fi
DB_USER="${DB_USERNAME:-postgres}"
DB="${DB_NAME:-auroraplus_db}"

echo "Esto va a REEMPLAZAR todos los datos actuales de $DB con el contenido de:"
echo "  $ARCHIVO"
read -r -p "Escriba 'si' (en minúsculas) para confirmar: " CONFIRMACION
if [ "$CONFIRMACION" != "si" ]; then
  echo "Cancelado — no se tocó nada."
  exit 1
fi

echo "==> Deteniendo la app para que nadie escriba durante la restauración"
docker compose stop app

mkdir -p backups
ACTUAL="backups/antes-de-restaurar_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "==> Respaldo de lo que hay ahora -> $ACTUAL"
docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB" | gzip > "$ACTUAL"

echo "==> Borrando y creando la base $DB vacía"
docker compose exec -T db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE \"$DB\";" \
  -c "CREATE DATABASE \"$DB\" OWNER \"$DB_USER\";"

echo "==> Cargando el respaldo (se detiene en el primer error)"
gunzip -c "$ARCHIVO" | docker compose exec -T db psql -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -q

echo "==> Levantando la app"
docker compose start app

echo "Restauración completada. Revise que la app siga funcionando: docker compose logs -f app"
echo "Si algo salió mal, lo que había antes quedó en: $ACTUAL"
