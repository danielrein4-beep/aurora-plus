-- Historial de cierres de caja de Mediclinic. Antes vivía solo en el navegador de quien cerraba:
-- si el médico o la secretaria cambiaban de computadora, el historial no estaba.
CREATE TABLE IF NOT EXISTS salud_cierres_caja (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    datos_json TEXT NOT NULL,
    creado_por VARCHAR(80),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_salud_cierres_caja_tenant_fecha ON salud_cierres_caja (tenant_id, fecha DESC);
