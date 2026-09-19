-- =============================================================================
-- Migracion Flyway V44: Hardening de Seguridad de SuperAdmin
-- =============================================================================

-- 1. Agregar token_version para permitir revocacion inmediata de tokens JWT
ALTER TABLE usuarios_super_admin 
ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
