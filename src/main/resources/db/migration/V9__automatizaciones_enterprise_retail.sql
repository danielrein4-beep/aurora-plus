-- Soporte de esquema para 5 automatizaciones de la vertical Comercio/Retail:
-- (1) tasa de cambio obsoleta ya se resuelve con TasaCambio.fecha_actualizacion,
--     que ya existe — no requiere cambio de esquema.
-- (2) Smart Restocking: umbral de reposición por ítem + proveedor principal +
--     borradores de orden de compra.
ALTER TABLE repuestos_items ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(18,4) NOT NULL DEFAULT 5;
ALTER TABLE repuestos_items ADD COLUMN IF NOT EXISTS proveedor_principal_id BIGINT REFERENCES proveedores_repuestos(id);

CREATE TABLE IF NOT EXISTS ordenes_compra_sugeridas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    repuesto_id BIGINT NOT NULL REFERENCES repuestos_items(id),
    proveedor_id BIGINT REFERENCES proveedores_repuestos(id),
    cantidad_sugerida NUMERIC(18,4) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    motivo VARCHAR(255),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ocs_tenant_repuesto_estado ON ordenes_compra_sugeridas(tenant_id, repuesto_id, estado);

-- (4) Auditoría antifraude en Cierre Z: margen de tolerancia por tenant +
--     tabla genérica de alertas silenciosas para el rol administrador.
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS margen_tolerancia_descuadre NUMERIC(18,2) NOT NULL DEFAULT 2.00;

CREATE TABLE IF NOT EXISTS alertas_admin (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alertas_admin_tenant_leida ON alertas_admin(tenant_id, leida);

-- (5) Clasificación ABC de clientes: campo de clasificación + descuento
--     automático, y trazabilidad de qué cliente hizo cada venta de repuestos
--     (antes el Kárdex no sabía quién compró, solo qué ítem y cuánto stock).
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS descuento_automatico_porcentaje NUMERIC(5,2);

ALTER TABLE movimientos_repuesto ADD COLUMN IF NOT EXISTS cliente_id BIGINT REFERENCES clientes(id);
ALTER TABLE movimientos_repuesto ADD COLUMN IF NOT EXISTS total NUMERIC(18,2);
CREATE INDEX IF NOT EXISTS idx_movimientos_repuesto_cliente ON movimientos_repuesto(cliente_id, fecha_registro);
