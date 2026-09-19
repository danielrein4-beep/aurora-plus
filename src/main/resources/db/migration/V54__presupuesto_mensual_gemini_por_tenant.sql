CREATE TABLE IF NOT EXISTS comercio_gemini_consumo_mensual (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    periodo VARCHAR(7) NOT NULL,
    llamadas INTEGER NOT NULL DEFAULT 0,
    tokens_entrada BIGINT NOT NULL DEFAULT 0,
    tokens_salida BIGINT NOT NULL DEFAULT 0,
    costo_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_gemini_consumo_tenant_periodo UNIQUE (tenant_id, periodo),
    CONSTRAINT ck_gemini_consumo_no_negativo CHECK (costo_usd >= 0)
);

CREATE INDEX IF NOT EXISTS idx_gemini_consumo_tenant
    ON comercio_gemini_consumo_mensual(tenant_id);
