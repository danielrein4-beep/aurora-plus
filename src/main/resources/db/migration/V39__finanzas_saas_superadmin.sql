-- V39: Modulo de contabilidad y finanzas SaaS para SuperAdmin (Gastos Fijos, Ingresos y Egresos)

CREATE TABLE IF NOT EXISTS core_saas_gastos_fijos (
    id BIGSERIAL PRIMARY KEY,
    concepto VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'INFRAESTRUCTURA',
    monto_usd NUMERIC(12, 2) NOT NULL,
    periodicidad VARCHAR(20) NOT NULL DEFAULT 'MENSUAL',
    dia_pago INT DEFAULT 1,
    metodo_pago VARCHAR(50) DEFAULT 'TARJETA_CREDITO',
    proveedor VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    notas VARCHAR(255),
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_saas_movimientos_financieros (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    concepto VARCHAR(200) NOT NULL,
    monto_usd NUMERIC(12, 2) NOT NULL,
    fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'TRANSFERENCIA_BANCARIA',
    referencia_comprobante VARCHAR(100),
    tenant_id BIGINT,
    gasto_fijo_id BIGINT REFERENCES core_saas_gastos_fijos(id) ON DELETE SET NULL,
    notas TEXT,
    registrado_por VARCHAR(60) NOT NULL DEFAULT 'superadmin',
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_gastos_fijos_activo ON core_saas_gastos_fijos(activo);
CREATE INDEX IF NOT EXISTS idx_saas_movimientos_tipo ON core_saas_movimientos_financieros(tipo);
CREATE INDEX IF NOT EXISTS idx_saas_movimientos_fecha ON core_saas_movimientos_financieros(fecha_movimiento);
