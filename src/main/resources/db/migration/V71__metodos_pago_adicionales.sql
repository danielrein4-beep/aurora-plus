ALTER TABLE licencias_tenant
    ADD COLUMN zelle_activo BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN zelle_correo VARCHAR(255),
    ADD COLUMN zelle_titular VARCHAR(255),
    ADD COLUMN binance_manual_activo BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN binance_pay_id VARCHAR(100),
    ADD COLUMN bancolombia_activo BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN bancolombia_cuenta VARCHAR(100),
    ADD COLUMN bancolombia_tipo_cuenta VARCHAR(30),
    ADD COLUMN bancolombia_titular VARCHAR(255),
    ADD COLUMN bancolombia_documento VARCHAR(50);
