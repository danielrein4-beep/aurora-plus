CREATE TABLE almacenes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_almacenes_tenant ON almacenes(tenant_id);

CREATE TABLE stock_almacen (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    almacen_id BIGINT NOT NULL,
    repuesto_id BIGINT NOT NULL,
    cantidad NUMERIC(18,4) NOT NULL DEFAULT 0,
    CONSTRAINT uq_stock_almacen_repuesto UNIQUE (almacen_id, repuesto_id)
);

CREATE INDEX idx_stock_almacen_tenant_repuesto ON stock_almacen(tenant_id, repuesto_id);
