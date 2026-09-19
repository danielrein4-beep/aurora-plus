-- Datos de Pago Movil del negocio para recepcion de transferencias y catalogo publico
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS pago_movil_banco VARCHAR(100);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS pago_movil_telefono VARCHAR(50);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS pago_movil_documento VARCHAR(50);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS pago_movil_titular VARCHAR(150);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS pago_movil_activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Datos semilla para tenant 2 (Ferreteria El Tornillo Feliz) para que funcione de inmediato
UPDATE licencias_tenant
SET pago_movil_banco = '0102 - Banco de Venezuela',
    pago_movil_telefono = '04141112233',
    pago_movil_documento = 'J-40123456-7',
    pago_movil_titular = 'Ferreteria El Tornillo Feliz C.A.'
WHERE tenant_id = 2 AND pago_movil_banco IS NULL;
