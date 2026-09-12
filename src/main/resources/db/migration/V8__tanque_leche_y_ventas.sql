CREATE TABLE IF NOT EXISTS tanques_leche (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    stock_actual_litros NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    capacidad_litros NUMERIC(12, 2) DEFAULT 2000.00,
    temperatura_celsius NUMERIC(5, 2) DEFAULT 4.0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas_leche_tanque (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    litros_vendidos NUMERIC(12, 2) NOT NULL,
    precio_litro_usd NUMERIC(10, 4) NOT NULL,
    total_usd NUMERIC(12, 2) NOT NULL,
    comprador_o_planta VARCHAR(255) NOT NULL,
    moneda_pago VARCHAR(20) DEFAULT 'USD',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE registros_ordeno ADD COLUMN IF NOT EXISTS destino VARCHAR(30) DEFAULT 'TANQUE';
