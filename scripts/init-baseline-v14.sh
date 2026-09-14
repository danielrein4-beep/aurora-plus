#!/usr/bin/env bash
# ==============================================================================
# Script: init-baseline-v14.sh
# Objetivo: Bootstrap reproducible para una base de datos Aurora Plus nueva (Linux/Hetzner).
# Carga el esquema canónico v14 y registra el baseline en flyway_schema_history.
# ==============================================================================

set -euo pipefail

DB_NAME="${1:-auroraplus_db}"
DB_USER="${2:-postgres}"
DB_HOST="${3:-localhost}"
DB_PORT="${4:-5432}"

echo "================================================================"
echo " Bootstrap Aurora Plus - Baseline v14"
echo " Base de datos: ${DB_NAME} en ${DB_HOST}:${DB_PORT} (usuario: ${DB_USER})"
echo "================================================================"

# 1. Crear base de datos vacía si no existe
echo "[1/3] Verificando / creando base de datos '${DB_NAME}'..."
DB_EXISTS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" | tr -d '[:space:]')
if [ "${DB_EXISTS}" != "1" ]; then
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} ENCODING 'UTF8';"
    echo "  > Base de datos '${DB_NAME}' creada exitosamente."
else
    echo "  > Base de datos '${DB_NAME}' ya existe."
fi

# 2. Cargar esquema canónico v14
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/../docs/schema-baseline-v14.sql"

if [ ! -f "${SCHEMA_FILE}" ]; then
    echo "Error: No se encontró el archivo de esquema: ${SCHEMA_FILE}" >&2
    exit 1
fi

echo "[2/3] Cargando esquema canónico desde docs/schema-baseline-v14.sql..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SCHEMA_FILE}" > /dev/null
TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d '[:space:]')
echo "  > Esquema cargado exitosamente (${TABLE_COUNT} tablas generadas)."

# 3. Registrar Baseline en flyway_schema_history
echo "[3/3] Registrando baseline v14 en flyway_schema_history..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
CREATE TABLE IF NOT EXISTS public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL,
    CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank)
);
CREATE INDEX IF NOT EXISTS flyway_schema_history_s_idx ON public.flyway_schema_history (success);

INSERT INTO public.flyway_schema_history (
    installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success
)
SELECT 1, '14', 'Baseline v14 esquema canonico', 'BASELINE', '<< Flyway Baseline >>', NULL, '${DB_USER}', now(), 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE version = '14' OR installed_rank = 1);
EOF

echo "  > Baseline v14 registrado. Flyway no aplicará migraciones anteriores a V15."
echo "================================================================"
echo " Base de datos '${DB_NAME}' lista para arrancar con ddl-auto=validate"
echo "================================================================"
