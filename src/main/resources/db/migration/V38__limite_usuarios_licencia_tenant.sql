-- Migración V38: Límite de usuarios configurables por tenant
-- Si limite_usuarios es NULL o <= 0, el tenant tiene usuarios ilimitados.
-- Si tiene un valor positivo, el sistema bloquea la creación de nuevos usuarios al alcanzar el tope.

ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS limite_usuarios INT DEFAULT NULL;
