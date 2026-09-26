#!/bin/sh
# Corre DENTRO del contenedor "backup" (ver docker-compose.yml) — nunca en la
# máquina de desarrollo. Hace un pg_dump completo cada BACKUP_INTERVAL_SECONDS,
# comprimido, a /backups (montado como carpeta real del host en Hetzner, NO un
# volumen de Docker interno) — así el respaldo sobrevive aunque se borren o
# recreen los contenedores, y se puede copiar fuera del servidor (scp/rsync)
# sin tener que entrar a ningún contenedor.
#
# Antes era "pg_dump | gzip > archivo": sh no tiene pipefail, así que si pg_dump
# fallaba el if veía el éxito de gzip, quedaba un .gz casi vacío y el log decía
# "Respaldo completado". Ahora el volcado va primero a un archivo, se revisa que
# pg_dump terminó bien, que el archivo no está vacío y que el .gz no está dañado.
# Los respaldos viejos solo se borran después de un respaldo bueno.
set -u

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"

mkdir -p /backups

echo "[backup] Servicio de respaldo iniciado. Intervalo: ${INTERVAL_SECONDS}s — Retención: ${RETENTION_DAYS} días."

while true; do
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  TEMPORAL="/backups/.en_curso_${TIMESTAMP}.sql"
  ARCHIVO="/backups/auroraplus_${TIMESTAMP}.sql.gz"

  echo "[backup] Iniciando respaldo -> ${ARCHIVO}"
  if PGPASSWORD="$DB_PASSWORD" pg_dump -h db -U "$DB_USERNAME" -d "$DB_NAME" -f "$TEMPORAL" \
     && [ -s "$TEMPORAL" ] \
     && grep -q "PostgreSQL database dump complete" "$TEMPORAL" \
     && gzip -c "$TEMPORAL" > "$ARCHIVO" \
     && gzip -t "$ARCHIVO"; then
    rm -f "$TEMPORAL"
    echo "[backup] Respaldo completado ($(du -h "$ARCHIVO" | cut -f1))"
    # Archivos subidos (fotos, comprobantes): no están en la base, se guardan aparte.
    if [ -d /uploads ] && [ -n "$(ls -A /uploads 2>/dev/null)" ]; then
      if tar -czf "/backups/uploads_${TIMESTAMP}.tar.gz" -C /uploads .; then
        echo "[backup] Archivos subidos respaldados"
      else
        echo "[backup] ERROR: no se pudieron respaldar los archivos subidos"
        rm -f "/backups/uploads_${TIMESTAMP}.tar.gz"
      fi
    fi
    echo "[backup] Eliminando respaldos con más de ${RETENTION_DAYS} días..."
    find /backups \( -name "auroraplus_*.sql.gz" -o -name "uploads_*.tar.gz" \) -mtime "+${RETENTION_DAYS}" -delete
  else
    echo "[backup] ERROR: el respaldo falló — se conservan todos los respaldos anteriores, no se borra nada."
    rm -f "$TEMPORAL" "$ARCHIVO"
  fi

  sleep "$INTERVAL_SECONDS"
done
