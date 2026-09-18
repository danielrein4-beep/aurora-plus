-- V37: Registro de pagos de suscripciones y control financiero de SuperAdmin
CREATE TABLE IF NOT EXISTS pagos_suscripcion_tenant (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    monto NUMERIC(18, 2) NOT NULL,
    moneda VARCHAR(10) NOT NULL DEFAULT 'USD',
    metodo_pago VARCHAR(40) NOT NULL DEFAULT 'BINANCE_USDT',
    referencia_comprobante VARCHAR(255),
    meses_pagados INT NOT NULL DEFAULT 1,
    dias_acreditados INT NOT NULL DEFAULT 30,
    fecha_pago TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADO',
    notas TEXT,
    registrado_por VARCHAR(60) NOT NULL DEFAULT 'superadmin'
);

CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_tenant_id ON pagos_suscripcion_tenant(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_fecha ON pagos_suscripcion_tenant(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_estado ON pagos_suscripcion_tenant(estado);
