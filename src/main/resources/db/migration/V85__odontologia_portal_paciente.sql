-- V85: Odontologia - portal del paciente
-- Enlace personal (QR en la receta) para que el paciente vea su diagnostico, su plan,
-- sus citas y recetas, y suba sus radiografias.

-- Se guarda solo el hash SHA-256 del token: con una copia de la base no se puede
-- entrar al portal de nadie. Cada enlace vence y puede revocarse.
CREATE TABLE IF NOT EXISTS salud_odontologia_portal_enlaces (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    token_hash CHAR(64) NOT NULL,
    creado_por VARCHAR(100),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    fecha_expiracion TIMESTAMP NOT NULL,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_acceso TIMESTAMP,
    -- Verificacion de identidad (ultimos 4 digitos de la cedula): tras 5 fallos el enlace se bloquea 15 minutos.
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    CONSTRAINT uq_portal_odonto_token UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_portal_odonto_paciente
ON salud_odontologia_portal_enlaces (tenant_id, paciente_id);

-- Radiografias subidas por el propio paciente: quedan marcadas para que el odontologo las revise.
ALTER TABLE salud_odontologia_radiografias
    ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'CLINICA',
    ADD COLUMN IF NOT EXISTS revisada BOOLEAN NOT NULL DEFAULT TRUE;
