-- Datos de crédito del cliente de Comercio (antes solo vivían en el navegador).
ALTER TABLE clientes
    ADD COLUMN direccion VARCHAR(255),
    ADD COLUMN limite_credito NUMERIC(18,2),
    ADD COLUMN saldo_pendiente NUMERIC(18,2);

-- Detalle de ventas del mostrador (líneas, pagos, cliente) — antes solo en localStorage.
-- detalle_json guarda la venta completa tal como la arma el POS; las columnas sueltas
-- existen para consultar/ordenar sin abrir el JSON.
CREATE TABLE ventas_mostrador (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    numero VARCHAR(40) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    cliente_nombre VARCHAR(160),
    cliente_documento VARCHAR(60),
    total NUMERIC(18,2) NOT NULL DEFAULT 0,
    utilidad NUMERIC(18,2),
    metodo_pago VARCHAR(40),
    es_credito BOOLEAN NOT NULL DEFAULT FALSE,
    detalle_json TEXT NOT NULL,
    CONSTRAINT uq_ventas_mostrador_tenant_numero UNIQUE (tenant_id, numero)
);

CREATE INDEX idx_ventas_mostrador_tenant_fecha ON ventas_mostrador(tenant_id, fecha_registro DESC);
