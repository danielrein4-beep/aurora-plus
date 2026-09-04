#!/bin/sh
# Corre DENTRO del contenedor "backup" (ver docker-compose.yml) — nunca en la
# máquina de desarrollo. Hace un pg_dump completo cada BACKUP_INTERVAL_SECONDS,
# comprimido, a /backups (montado como carpeta real del host en Hetzner, NO un
# volumen de Docker interno) — así el respaldo sobrevive aunque se borren o
# recreen los contenedores, y se puede copiar fuera del servidor (scp/rsync)
# sin tener que entrar a ningún contenedor.
set -e

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"

mkdir -p /backups

echo "[backup] Servicio de respaldo iniciado. Intervalo: ${INTERVAL_SECONDS}s — Retención: ${RETENTION_DAYS} días."

while true; do
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  ARCHIVO="/backups/auroraplus_${TIMESTAMP}.sql.gz"

  echo "[backup] Iniciando respaldo -> ${ARCHIVO}"
  if PGPASSWORD="$DB_PASSWORD" pg_dump -h db -U "$DB_USERNAME" -d "$DB_NAME" | gzip > "$ARCHIVO"; then
    echo "[backup] Respaldo completado ($(du -h "$ARCHIVO" | cut -f1))"
  else
    echo "[backup] ERROR: el respaldo falló — se conserva el último respaldo bueno, no se borra nada."
    rm -f "$ARCHIVO"
  fi

  echo "[backup] Eliminando respaldos con más de ${RETENTION_DAYS} días..."
  find /backups -name "auroraplus_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

  sleep "$INTERVAL_SECONDS"
done
