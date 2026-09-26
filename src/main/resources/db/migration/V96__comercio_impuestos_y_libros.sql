-- Impuestos y cargos por negocio (Comercio) y libros de compras y ventas para el contador.
--
-- Todo apagado por defecto: un negocio que no configure nada sigue vendiendo exactamente igual.

-- 1. Configuración por negocio
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS cobra_iva BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS alicuota_iva NUMERIC(5,2) NOT NULL DEFAULT 16.00;
-- TRUE: el precio de venta ya trae el IVA adentro (el total no cambia, se desglosa).
-- FALSE: el IVA se suma encima del precio al cobrar.
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS precios_incluyen_iva BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS igtf_activo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS alicuota_igtf NUMERIC(5,2) NOT NULL DEFAULT 3.00;
-- Catálogo público: mostrar el precio con IVA incluido (TRUE) o el precio sin IVA más "+ IVA" (FALSE).
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS catalogo_precio_con_iva BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Productos exentos de IVA (alimentos de la cesta básica, medicinas, etc.)
ALTER TABLE repuestos_items ADD COLUMN IF NOT EXISTS exento_iva BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Libro de ventas: una fila por ticket cobrado, escrita por el servidor en la misma
--    transacción del cobro. Montos en la moneda base del negocio y la tasa BCV del día,
--    para expresar el libro en bolívares.
CREATE TABLE IF NOT EXISTS libro_ventas (
    id               BIGSERIAL PRIMARY KEY,
    tenant_id        BIGINT         NOT NULL,
    numero_ticket    VARCHAR(40)    NOT NULL,
    fecha            TIMESTAMP      NOT NULL DEFAULT NOW(),
    cliente_nombre   VARCHAR(160),
    cliente_rif      VARCHAR(60),
    numero_control   VARCHAR(30),
    moneda_base      VARCHAR(3)     NOT NULL DEFAULT 'USD',
    tasa_bcv         NUMERIC(18,6),
    monto_exento     NUMERIC(18,2)  NOT NULL DEFAULT 0,
    base_imponible   NUMERIC(18,2)  NOT NULL DEFAULT 0,
    alicuota_iva     NUMERIC(5,2)   NOT NULL DEFAULT 0,
    monto_iva        NUMERIC(18,2)  NOT NULL DEFAULT 0,
    monto_igtf       NUMERIC(18,2)  NOT NULL DEFAULT 0,
    monto_delivery   NUMERIC(18,2)  NOT NULL DEFAULT 0,
    total            NUMERIC(18,2)  NOT NULL DEFAULT 0,
    iva_quitado      BOOLEAN        NOT NULL DEFAULT FALSE,
    iva_quitado_por  VARCHAR(160),
    es_credito       BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_libro_ventas_ticket UNIQUE (tenant_id, numero_ticket)
);
CREATE INDEX IF NOT EXISTS idx_libro_ventas_tenant_fecha ON libro_ventas (tenant_id, fecha);

-- 4. Datos fiscales de las compras (libro de compras)
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS numero_control VARCHAR(30);
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS monto_exento NUMERIC(18,2);
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS base_imponible NUMERIC(18,2);
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS alicuota_iva NUMERIC(5,2);
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS monto_iva NUMERIC(18,2);
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS iva_retenido NUMERIC(18,2);
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS tasa_bcv NUMERIC(18,6);
