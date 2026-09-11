-- Permite invalidar sesiones activas cuando cambia la contraseña (ver
-- Usuario.tokenVersion, JwtService y TenantInterceptor). Los usuarios
-- existentes arrancan en 0, que es exactamente el valor que ya llevan sus
-- tokens vigentes emitidos antes de esta migración.
ALTER TABLE usuarios ADD COLUMN token_version integer NOT NULL DEFAULT 0;
