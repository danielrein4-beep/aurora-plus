-- Ceba en sociedad: animales de un socio que se engordan en la finca y cuyos
-- kilos ganados se reparten según un porcentaje acordado.
CREATE TABLE IF NOT EXISTS sociedades_ceba (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT        NOT NULL,
    nombre_socio        VARCHAR(150)  NOT NULL,
    documento_socio     VARCHAR(40),
    telefono_socio      VARCHAR(40),
    porcentaje_finca    NUMERIC(5, 2) NOT NULL,
    fecha_inicio        DATE          NOT NULL,
    estado              VARCHAR(20)   NOT NULL DEFAULT 'ACTIVA',
    fecha_cierre        DATE,
    notas               VARCHAR(500),
    CONSTRAINT ck_sociedades_ceba_porcentaje CHECK (porcentaje_finca >= 0 AND porcentaje_finca <= 100)
);
CREATE INDEX IF NOT EXISTS idx_sociedades_ceba_tenant ON sociedades_ceba (tenant_id);

-- Cada animal puede pertenecer a una sociedad; el peso/fecha de entrada son la
-- base para calcular los kilos ganados en la finca.
ALTER TABLE animales ADD COLUMN IF NOT EXISTS sociedad_ceba_id BIGINT;
ALTER TABLE animales ADD COLUMN IF NOT EXISTS peso_entrada_sociedad NUMERIC(10, 2);
ALTER TABLE animales ADD COLUMN IF NOT EXISTS fecha_entrada_sociedad DATE;
CREATE INDEX IF NOT EXISTS idx_animales_sociedad_ceba ON animales (sociedad_ceba_id);
