# ==============================================================================
# Script: init-baseline-v53.ps1
# Objetivo: Bootstrap reproducible para una base de datos Aurora Plus nueva.
# Carga el esquema canónico v53 y registra el baseline en flyway_schema_history.
# Seguridad:
# - Rechaza contraseñas vacías (exige PGPASSWORD o -DbPassword).
# - No tiene nombre de base por defecto (parámetro obligatorio).
# - Falla inmediatamente ante cualquier error SQL (ON_ERROR_STOP=1).
# - Rechaza y aborta si la base de datos ya existe, salvo con -VerifyOnly.
# ==============================================================================

param (
    [string]$DbName,
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbPassword,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"

if (-not $DbName) {
    Write-Error "Seguridad operativa: Debe especificar el parámetro -DbName con el nombre de la base de datos destino."
    exit 1
}

# 1. Seguridad de credenciales: rechazar contraseñas por defecto / no provistas
if ($DbPassword) {
    $env:PGPASSWORD = $DbPassword
} elseif (-not $env:PGPASSWORD) {
    Write-Error "Seguridad operativa: No se detectó contraseña de PostgreSQL. Defina la variable de entorno PGPASSWORD o use el parámetro -DbPassword."
    exit 1
}

# 2. Localizar psql
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
Write-Host " Bootstrap Aurora Plus - Baseline v53" -ForegroundColor Cyan
Write-Host " Base de datos: $DbName en ${DbHost}:${DbPort} (usuario: $DbUser)" -ForegroundColor Cyan
Write-Host " Modo: $(if ($VerifyOnly) { 'VERIFICACIÓN NO DESTRUCTIVA' } else { 'INICIALIZACIÓN NUEVA' })" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 3. Comprobar existencia previa de la base de datos
$dbExistsRaw = & $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='$DbName';"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al conectar con PostgreSQL en ${DbHost}:${DbPort}"
    exit 1
}
$dbExists = ($null -ne $dbExistsRaw -and "$dbExistsRaw".Trim() -eq "1")

# Si se solicitó solo verificación no destructiva
if ($VerifyOnly) {
    if (-not $dbExists) {
        Write-Error "Modo verificación: La base de datos '$DbName' no existe."
        exit 1
    }
    Write-Host "[Verificación] Comprobando estado de '$DbName'..." -ForegroundColor Yellow
    $tableCount = (& $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';").Trim()
    $flywayStatus = (& $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -A -c "SELECT version || ' (' || success || ')' FROM public.flyway_schema_history WHERE version='53' ORDER BY installed_rank DESC LIMIT 1;" 2>$null)
    Write-Host "  > Tablas base en 'public': $tableCount" -ForegroundColor Green
    Write-Host "  > Estado Flyway baseline: $(if ($flywayStatus) { $flywayStatus.Trim() } else { 'NO REGISTRADO' })" -ForegroundColor Green
    Write-Host "Verificación no destructiva completada exitosamente." -ForegroundColor Cyan
    exit 0
}

# 4. Seguridad contra sobreescritura: rechazar bases existentes
if ($dbExists) {
    Write-Error "Seguridad operativa: La base de datos '$DbName' YA EXISTE en ${DbHost}:${DbPort}. Este script rechaza bases existentes para proteger datos. Si solo desea verificar su estado use el parámetro -VerifyOnly."
    exit 1
}

# 5. Crear la base de datos vacía
Write-Host "[1/3] Creando base de datos limpia '$DbName'..." -ForegroundColor Yellow
& $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName ENCODING 'UTF8';"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo al crear la base de datos '$DbName'."
    exit 1
}
Write-Host "  > Base de datos creada exitosamente." -ForegroundColor Green

# 6. Cargar esquema canónico con ON_ERROR_STOP
$schemaFile = Join-Path (Get-Location) "docs\schema-baseline-v53.sql"
if (-not (Test-Path $schemaFile)) {
    Write-Error "No se encontró el archivo de esquema: $schemaFile"
    exit 1
}

Write-Host "[2/3] Aplicando esquema canónico (docs/schema-baseline-v53.sql) con ON_ERROR_STOP..." -ForegroundColor Yellow
& $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $schemaFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo crítico al aplicar el DDL en '$DbName'. La ejecución se detuvo inmediatamente."
    exit 1
}
$tableCount = (& $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';").Trim()
Write-Host "  > DDL aplicado exitosamente ($tableCount tablas generadas)." -ForegroundColor Green

# 7. Registrar Baseline en flyway_schema_history
Write-Host "[3/3] Registrando baseline v53 en flyway_schema_history..." -ForegroundColor Yellow
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
SELECT 1, '53', 'Baseline v53 esquema canonico', 'BASELINE', '<< Flyway Baseline >>', NULL, '$DbUser', now(), 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE version = '53' OR installed_rank = 1);
"@

& $psqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -c $flywayBaselineSql
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo al registrar el baseline de Flyway en '$DbName'."
    exit 1
}
Write-Host "  > Baseline v53 registrado. Flyway no aplicará migraciones anteriores o iguales a V53." -ForegroundColor Green

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Base de datos '$DbName' lista para producción con ddl-auto=validate" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
