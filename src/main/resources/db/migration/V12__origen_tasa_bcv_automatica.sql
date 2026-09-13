-- Preferencia por tenant: quién gobierna la tasa USD->VES de este negocio. MANUAL por defecto
-- para todos los tenants existentes — nadie pasa a modo automático sin pedirlo.
ALTER TABLE licencias_tenant ADD COLUMN origen_tasa_usd_ves VARCHAR(10) NOT NULL DEFAULT 'MANUAL';
