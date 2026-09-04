#!/bin/bash
# Ejecutar en el HOST de Hetzner (donde corre docker compose), NO dentro de un
# contenedor. Restaura un respaldo de /backups sobre la base de datos que está
# corriendo AHORA MISMO en el servicio "db" de docker-compose.
#
# ADVERTENCIA: esto BORRA y REEMPLAZA todos los datos actuales de la base con
# los del respaldo elegido. No hay deshacer — si la base actual tiene datos
# que no están en el respaldo, se pierden.
#
# Uso: ./docker/backup/restore.sh backups/auroraplus_20260101_120000.sql.gz
set -e

ARCHIVO="$1"
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

echo "Esto va a REEMPLAZAR todos los datos actuales de auroraplus_db con el contenido de:"
echo "  $ARCHIVO"
read -p "Escriba 'si' (en minúsculas) para confirmar: " CONFIRMACION
if [ "$CONFIRMACION" != "si" ]; then
  echo "Cancelado — no se tocó nada."
  exit 1
fi

echo "Restaurando..."
gunzip -c "$ARCHIVO" | docker compose exec -T db psql -U postgres -d auroraplus_db

echo "Restauración completada. Revise que la app siga funcionando: docker compose logs -f app"
