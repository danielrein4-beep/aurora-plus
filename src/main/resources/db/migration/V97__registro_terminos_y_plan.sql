-- Constancia de que quien registró el negocio aceptó los Términos y la Política de Privacidad
-- (cuándo, qué versión y desde qué IP), y el plan que eligió en la web antes de registrarse.
-- Antes la casilla solo se validaba en pantalla y no quedaba ningún registro.
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS terminos_aceptados_en TIMESTAMP;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS terminos_version VARCHAR(20);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS terminos_ip VARCHAR(64);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS plan_solicitado VARCHAR(20);
