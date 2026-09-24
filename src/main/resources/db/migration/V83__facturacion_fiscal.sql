ALTER TABLE licencias_tenant
    ADD COLUMN modo_facturacion_fiscal VARCHAR(20) NOT NULL DEFAULT 'NINGUNA',
    ADD COLUMN factura_serie VARCHAR(10),
    ADD COLUMN factura_numero_actual BIGINT,
    ADD COLUMN factura_numero_hasta BIGINT;
