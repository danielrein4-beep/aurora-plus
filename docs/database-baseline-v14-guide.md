# Guía de Bootstrap de Base de Datos Reproducible (Baseline v14)

Este documento describe el procedimiento oficial para inicializar una base de datos PostgreSQL vacía para **Aurora Plus** (desarrollo, staging o producción en Hetzner) sin depender de `ddl-auto=create` en caliente y manteniendo la compatibilidad absoluta con Flyway.

---

## 1. Contexto y Problema Resuelto

1. **Inexistencia de `V1__init.sql`**: Flyway se introdujo en el proyecto cuando ya existían ~127 tablas previas creadas orgánicamente. Por tanto, las migraciones en `src/main/resources/db/migration/` comienzan desde `V2` (scripts `ALTER TABLE`).
2. **Fallo en bases vacías**: Al iniciar una base limpia sin tablas, Flyway `V2` fallaba intentando alterar tablas inexistentes (`relation items_venta_retail does not exist`), y Hibernate en modo `validate` no permitía el arranque.
3. **Solución**: El artefacto [`docs/schema-baseline-v14.sql`](schema-baseline-v14.sql) contiene el esquema canónico completo (148 tablas, índices, secuencias y constraints) correspondiente a la versión 14, sin datos, sin propietarios específicos y excluyendo tablas de sistema.

---

## 2. Procedimiento de Inicialización

### En Windows (PowerShell)
```powershell
# Ejecutar desde la raíz del proyecto
.\scripts\init-baseline-v14.ps1 -DbName "aurora_produccion" -DbUser "postgres" -DbHost "localhost" -DbPort 5432
```

### En Linux / Hetzner (Bash)
```bash
chmod +x scripts/init-baseline-v14.sh
./scripts/init-baseline-v14.sh "aurora_produccion" "postgres" "localhost" 5432
```

### Paso a paso manual (si se prefiere psql puro)
1. Crear la base vacía con codificación UTF-8:
   ```sql
   CREATE DATABASE aurora_produccion ENCODING 'UTF8';
   ```
2. Cargar el esquema canónico:
   ```bash
   psql -U postgres -d aurora_produccion -f docs/schema-baseline-v14.sql
   ```
3. Registrar la versión baseline 14 en Flyway:
   ```sql
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
   ) VALUES (1, '14', 'Baseline v14 esquema canonico', 'BASELINE', '<< Flyway Baseline >>', NULL, 'postgres', now(), 0, true);
   ```

---

## 3. Configuración del Backend para Arranque

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

## 4. Evolución Futura de Esquema (V15 en adelante)

* A partir de este baseline, cualquier nueva alteración de base de datos se agregará en:
  `src/main/resources/db/migration/V15__descripcion_del_cambio.sql`
* Cuando la aplicación arranque:
  * Flyway detectará que la base está en versión `14`.
  * Aplicará `V15` automáticamente.
  * Funciona idéntico en bases existentes y en bases nuevas provisionadas con este procedimiento.
