#!/usr/bin/env bash
# ==============================================================================
# Script: init-baseline-v53.sh
# Objetivo: Bootstrap reproducible para una base de datos Aurora Plus nueva (Linux/Hetzner).
# Carga el esquema canónico v53 y registra el baseline en flyway_schema_history.
# Seguridad:
# - Rechaza contraseñas no provistas (exige PGPASSWORD).
# - No tiene nombre de base por defecto (parámetro obligatorio).
# - Falla inmediatamente ante cualquier error SQL (ON_ERROR_STOP=1).
# - Rechaza y aborta si la base de datos ya existe, salvo con --verify-only.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Error de seguridad operativa: Debe especificar el nombre de la base de datos destino." >&2
    echo "Uso: $0 <nombre_base_datos> [usuario] [host] [port] [--verify-only]" >&2
    exit 1
fi

DB_NAME="$1"
DB_USER="${2:-postgres}"
DB_HOST="${3:-localhost}"
DB_PORT="${4:-5432}"

VERIFY_ONLY=false
for arg in "$@"; do
    if [ "$arg" = "--verify-only" ]; then
        VERIFY_ONLY=true
    fi
done

if [ -z "${PGPASSWORD:-}" ]; then
    echo "Error de seguridad operativa: La variable de entorno PGPASSWORD no está definida." >&2
    echo "Por favor defina PGPASSWORD de forma segura antes de ejecutar este script." >&2
    exit 1
fi

echo "================================================================"
echo " Bootstrap Aurora Plus - Baseline v53"
echo " Base de datos: ${DB_NAME} en ${DB_HOST}:${DB_PORT} (usuario: ${DB_USER})"
echo " Modo: $([ "$VERIFY_ONLY" = true ] && echo "VERIFICACIÓN NO DESTRUCTIVA" || echo "INICIALIZACIÓN NUEVA")"
echo "================================================================"

# Comprobar si la base de datos ya existe (un error de conexión aborta inmediatamente por set -e)
DB_EXISTS=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';")

if [ "$VERIFY_ONLY" = true ]; then
    if [ "${DB_EXISTS}" != "1" ]; then
        echo "Modo verificación: La base de datos '${DB_NAME}' no existe." >&2
        exit 1
    fi
    echo "[Verificación] Comprobando estado de '${DB_NAME}'..."
    TABLE_COUNT=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
    FLYWAY_STATUS=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT version || ' (' || success || ')' FROM public.flyway_schema_history WHERE version='53' ORDER BY installed_rank DESC LIMIT 1;" 2>/dev/null || echo "NO REGISTRADO")
    echo "  > Tablas base en 'public': ${TABLE_COUNT}"
    echo "  > Estado Flyway baseline: ${FLYWAY_STATUS}"
    echo "Verificación no destructiva completada exitosamente."
    exit 0
fi

if [ "${DB_EXISTS}" = "1" ]; then
    echo "Error de seguridad operativa: La base de datos '${DB_NAME}' YA EXISTE en ${DB_HOST}:${DB_PORT}." >&2
    echo "Este script rechaza bases existentes para evitar sobreescritura accidental o corrupción de datos." >&2
    echo "Si solo desea verificar su estado use el argumento --verify-only." >&2
    exit 1
fi

# 1. Crear base de datos vacía
echo "[1/3] Creando base de datos limpia '${DB_NAME}'..."
psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} ENCODING 'UTF8';"
echo "  > Base de datos creada exitosamente."

# 2. Cargar esquema canónico v53 con ON_ERROR_STOP=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/../docs/schema-baseline-v53.sql"

if [ ! -f "${SCHEMA_FILE}" ]; then
    echo "Error: No se encontró el archivo de esquema: ${SCHEMA_FILE}" >&2
    exit 1
fi

echo "[2/3] Aplicando esquema canónico (docs/schema-baseline-v53.sql) con ON_ERROR_STOP..."
psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SCHEMA_FILE}" > /dev/null
TABLE_COUNT=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
echo "  > DDL aplicado exitosamente (${TABLE_COUNT} tablas generadas)."

# 3. Registrar Baseline en flyway_schema_history
echo "[3/3] Registrando baseline v53 en flyway_schema_history..."
psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
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
SELECT 1, '53', 'Baseline v53 esquema canonico', 'BASELINE', '<< Flyway Baseline >>', NULL, '${DB_USER}', now(), 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE version = '53' OR installed_rank = 1);
EOF

echo "  > Baseline v53 registrado. Flyway no aplicará migraciones anteriores o iguales a V53."
echo "================================================================"
echo " Base de datos '${DB_NAME}' lista para producción con ddl-auto=validate"
echo "================================================================"
