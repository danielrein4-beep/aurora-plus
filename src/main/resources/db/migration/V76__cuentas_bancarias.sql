CREATE TABLE cuentas_bancarias (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'BANCO',
    moneda VARCHAR(3) NOT NULL,
    saldo NUMERIC(18,2) NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cuentas_bancarias_tenant ON cuentas_bancarias(tenant_id);

CREATE TABLE movimientos_cuenta_bancaria (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    cuenta_id BIGINT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    monto NUMERIC(18,2) NOT NULL,
    saldo_anterior NUMERIC(18,2) NOT NULL,
    saldo_nuevo NUMERIC(18,2) NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_cuenta_bancaria_tenant_cuenta ON movimientos_cuenta_bancaria(tenant_id, cuenta_id, fecha_registro DESC);
