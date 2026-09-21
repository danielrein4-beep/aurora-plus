-- =============================================================================
-- Migración Flyway V62: Auditoría de Estados de Proyecto, Valuaciones y Moneda Explícita
-- =============================================================================

-- 1. Auditoría de ciclo de vida en proyectos de construcción
ALTER TABLE proyectos_construccion
    ADD COLUMN IF NOT EXISTS motivo_cambio_estado VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fecha_cambio_estado TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS usuario_cambio_estado VARCHAR(150);

-- 2. Auditoría y reverso en valuaciones de construcción
ALTER TABLE valuaciones_construccion
    ADD COLUMN IF NOT EXISTS motivo_reverso VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fecha_reverso TIMESTAMP WITHOUT TIME ZONE;

-- 3. Moneda explícita y tasa congelada en logística y despachos
ALTER TABLE despachos_construccion
    ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS tasa_cambio_congelada NUMERIC(18, 6),
    ADD COLUMN IF NOT EXISTS costo_flete_monto NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS costo_flete_moneda VARCHAR(10);

-- 4. Moneda explícita en maquinaria y equipos
ALTER TABLE maquinarias_construccion
    ADD COLUMN IF NOT EXISTS costo_hora_monto NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS costo_hora_moneda VARCHAR(10) DEFAULT 'USD';

-- 5. Moneda explícita en mantenimientos
ALTER TABLE mantenimientos_maquinaria_construccion
    ADD COLUMN IF NOT EXISTS costo_monto NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS costo_moneda VARCHAR(10) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS tasa_cambio_congelada NUMERIC(18, 6);

-- 6. Moneda explícita en cuadrillas y partes diarios
ALTER TABLE cuadrillas_construccion
    ADD COLUMN IF NOT EXISTS costo_jornal_monto NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS costo_jornal_moneda VARCHAR(10) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS capataz_empleado_id BIGINT,
    ADD COLUMN IF NOT EXISTS personal_real INT,
    ADD COLUMN IF NOT EXISTS cantidad_ejecutada_real NUMERIC(14, 4),
    ADD COLUMN IF NOT EXISTS rendimiento_real NUMERIC(10, 2);
