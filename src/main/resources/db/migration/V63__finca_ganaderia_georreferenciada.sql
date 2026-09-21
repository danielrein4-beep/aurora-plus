-- Configuración canónica de finca por tenant. Reemplaza configuración local del navegador.
CREATE TABLE fincas_ganaderia (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    latitud NUMERIC(10,7) NOT NULL,
    longitud NUMERIC(10,7) NOT NULL,
    puntos_interes_json TEXT NOT NULL DEFAULT '[]',
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_finca_ganaderia_tenant UNIQUE (tenant_id)
);
CREATE INDEX idx_finca_ganaderia_tenant ON fincas_ganaderia(tenant_id);
