# Guía de Bootstrap de Base de Datos Reproducible (Baseline v14)

Este documento describe el procedimiento oficial y seguro para inicializar una base de datos PostgreSQL vacía para **Aurora Plus** (desarrollo, staging o producción en Hetzner) sin depender de `ddl-auto=create` en caliente y manteniendo la compatibilidad absoluta con Flyway.

---

## 1. Contexto y Problema Resuelto

1. **Inexistencia de `V1__init.sql`**: Flyway se introdujo en el proyecto cuando ya existían ~127 tablas previas creadas orgánicamente. Por tanto, las migraciones en `src/main/resources/db/migration/` comienzan desde `V2` (scripts `ALTER TABLE`).
2. **Fallo en bases vacías**: Al iniciar una base limpia sin tablas, Flyway `V2` fallaba intentando alterar tablas inexistentes (`relation items_venta_retail does not exist`), y Hibernate en modo `validate` no permitía el arranque.
3. **Solución**: El artefacto [`docs/schema-baseline-v14.sql`](schema-baseline-v14.sql) contiene el esquema canónico completo (148 tablas, índices, secuencias y constraints) correspondiente a la versión 14, sin datos, sin propietarios específicos y excluyendo tablas de sistema.

---

## 2. Seguridad Operativa Incorporada

1. **Cero contraseñas por defecto**: No se asumen claves en texto plano. Los scripts exigen que la variable `PGPASSWORD` esté definida o se pase de forma explícita.
2. **Sin base de datos por defecto**: El parámetro de base de datos es estrictamente obligatorio para evitar apuntar accidentalmente a bases existentes o de producción (`auroraplus_db`, etc.).
3. **Protección contra sobreescritura**: Si la base de datos indicada ya existe, el script **aborta inmediatamente**, salvo que se invoque con el flag de verificación no destructiva (`-VerifyOnly` / `--verify-only`).
4. **Fallo inmediato ante errores SQL**: Todas las llamadas a `psql` utilizan `-v ON_ERROR_STOP=1`. Si una sentencia DDL falla, la ejecución se detiene en el acto.

---

## 3. Procedimiento de Inicialización

### En Windows (PowerShell)
```powershell
# 1. Definir contraseña de forma segura
$env:PGPASSWORD = "tu_password_seguro"

# 2. Ejecutar inicialización de base limpia
.\scripts\init-baseline-v14.ps1 -DbName "aurora_produccion" -DbUser "postgres" -DbHost "localhost" -DbPort 5432

# (Opcional) Verificación no destructiva sobre una base ya inicializada:
.\scripts\init-baseline-v14.ps1 -DbName "aurora_produccion" -VerifyOnly
```

### En Linux / Hetzner (Bash)
```bash
# 1. Definir contraseña de forma segura
export PGPASSWORD="tu_password_seguro"

# 2. Ejecutar inicialización de base limpia
chmod +x scripts/init-baseline-v14.sh
./scripts/init-baseline-v14.sh "aurora_produccion" "postgres" "localhost" 5432

# (Opcional) Verificación no destructiva sobre una base ya inicializada:
./scripts/init-baseline-v14.sh "aurora_produccion" "postgres" "localhost" 5432 --verify-only
```

---

## 4. Configuración del Backend para Arranque

Una vez inicializada la base con el baseline v14, el backend Spring Boot arranca con las configuraciones estándar de producción:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/aurora_produccion
spring.datasource.username=postgres
spring.datasource.password=${DB_PASSWORD}

# Validación estricta — Hibernate NO modifica el esquema
spring.jpa.hibernate.ddl-auto=validate

# Flyway activo — detecta baseline 14 y no aplica nada anterior a V15
spring.flyway.enabled=true
```

---

## 5. Evolución Futura de Esquema (V15 en adelante)

* A partir de este baseline, cualquier nueva alteración de base de datos se agregará en:
  `src/main/resources/db/migration/V15__descripcion_del_cambio.sql`
* Cuando la aplicación arranque:
  * Flyway detectará que la base está en versión `14`.
  * Aplicará `V15` automáticamente.
  * Funciona idéntico en bases existentes y en bases nuevas provisionadas con este procedimiento.
