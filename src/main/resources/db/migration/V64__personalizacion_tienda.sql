ALTER TABLE licencias_tenant
    ADD COLUMN personalizacion_tienda_activa BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN color_acento_tienda VARCHAR(7),
    ADD COLUMN banner_base64 TEXT;
