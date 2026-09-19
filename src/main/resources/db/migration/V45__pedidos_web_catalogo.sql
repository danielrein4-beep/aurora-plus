-- =============================================================================
-- Migracion Flyway V45: Pedidos Web del Catalogo Publico para Comercio y Retail
-- =============================================================================

CREATE TABLE IF NOT EXISTS comercio_pedidos_web (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    numero_pedido VARCHAR(40) NOT NULL,
    cliente_nombre VARCHAR(120) NOT NULL,
    cliente_telefono VARCHAR(40) NOT NULL,
    tipo_entrega VARCHAR(30) NOT NULL DEFAULT 'DELIVERY',
    direccion_entrega TEXT,
    metodo_pago VARCHAR(40) NOT NULL DEFAULT 'PAGO_MOVIL',
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    total_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_bs NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    tasa_cambio NUMERIC(18, 4) NOT NULL DEFAULT 1.0000,
    items_json TEXT NOT NULL,
    notas TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedidos_web_tenant ON comercio_pedidos_web(tenant_id, fecha_creacion DESC);
