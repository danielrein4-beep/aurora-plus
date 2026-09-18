ALTER TABLE empleados ADD COLUMN IF NOT EXISTS periodicidad_pago VARCHAR(20) NOT NULL DEFAULT 'MENSUAL';

CREATE TABLE IF NOT EXISTS pagos_nomina (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL REFERENCES empleados(id),
    nombre_empleado VARCHAR(255) NOT NULL,
    cedula_empleado VARCHAR(50),
    cargo_empleado VARCHAR(100),
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    tipo_control VARCHAR(20) NOT NULL,
    horas_trabajadas NUMERIC(18,2),
    monto NUMERIC(18,2) NOT NULL,
    moneda VARCHAR(5) NOT NULL,
    movimiento_caja_id BIGINT,
    fecha_pago TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_nomina_tenant_empleado ON pagos_nomina(tenant_id, empleado_id);
