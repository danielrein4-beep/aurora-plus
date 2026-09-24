-- Equipo de administración de la plataforma: varias cuentas con roles.
-- Las cuentas existentes quedan como PROPIETARIO (el poder total que ya tenían).
-- debe_cambiar_clave: la cuenta se creó (o se reseteó) con una clave temporal y
-- no puede hacer nada salvo cambiarla (lo hace cumplir TenantInterceptor).
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'PROPIETARIO';
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(120);
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP;
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS debe_cambiar_clave BOOLEAN NOT NULL DEFAULT FALSE;
