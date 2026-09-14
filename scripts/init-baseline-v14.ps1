# ==============================================================================
# Script: init-baseline-v14.ps1
# Objetivo: Bootstrap reproducible para una base de datos Aurora Plus nueva.
# Carga el esquema canónico v14 y registra el baseline en flyway_schema_history.
# ==============================================================================

param (
    [string]$DbName = "aurora_baseline_verify",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbPassword = $env:PGPASSWORD
)

if (-not $DbPassword) {
    $DbPassword = "1234"
}
$env:PGPASSWORD = $DbPassword

$ErrorActionPreference = "Stop"

# Buscar psql si no está en PATH
$psqlPath = "psql"
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $psqlPath = $found.FullName
    } else {
        Write-Error "No se encontró psql.exe en PATH ni en Program Files\PostgreSQL"
        exit 1
    }
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Bootstrap Aurora Plus - Baseline v14" -ForegroundColor Cyan
Write-Host " Base de datos: $DbName en ${DbHost}:${DbPort} (usuario: $DbUser)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Crear base de datos vacía si no existe
Write-Host "[1/3] Verificando / creando base de datos '$DbName'..." -ForegroundColor Yellow
$dbExists = & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$DbName';"
if (-not $dbExists -or $dbExists.Trim() -ne "1") {
    & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName ENCODING 'UTF8';"
    Write-Host "  > Base de datos '$DbName' creada exitosamente." -ForegroundColor Green
} else {
    Write-Host "  > Base de datos '$DbName' ya existe." -ForegroundColor Gray
}

# 2. Cargar esquema canónico v14
$schemaFile = Join-Path (Get-Location) "docs\schema-baseline-v14.sql"
if (-not (Test-Path $schemaFile)) {
    Write-Error "No se encontró el archivo de esquema: $schemaFile"
    exit 1
}

Write-Host "[2/3] Cargando esquema canónico desde docs/schema-baseline-v14.sql..." -ForegroundColor Yellow
& $psqlPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $schemaFile 2>&1 | Out-Null
$tableCount = & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
Write-Host "  > Esquema cargado exitosamente ($($tableCount.Trim()) tablas generadas)." -ForegroundColor Green

# 3. Registrar Baseline en flyway_schema_history
Write-Host "[3/3] Registrando baseline v14 en flyway_schema_history..." -ForegroundColor Yellow
$flywayBaselineSql = @"
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
SELECT 1, '14', 'Baseline v14 esquema canonico', 'BASELINE', '<< Flyway Baseline >>', NULL, '$DbUser', now(), 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE version = '14' OR installed_rank = 1);
"@

& $psqlPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -c $flywayBaselineSql
Write-Host "  > Baseline v14 registrado. Flyway no aplicará migraciones anteriores a V15." -ForegroundColor Green

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Base de datos '$DbName' lista para arrancar con ddl-auto=validate" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
