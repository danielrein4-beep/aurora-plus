-- V81: Odontologia - practica clinica diaria
-- 1. Periodontograma con margen gingival (para calcular nivel de insercion) e historial.
-- 2. Recetas odontologicas guardadas en el expediente.
-- 3. Consentimientos informados firmados por el paciente.

-- 1. Margen gingival por sitio, en mm respecto al limite amelocementario:
--    positivo = recesion, negativo = agrandamiento gingival. NIC = sondaje + margen.
ALTER TABLE salud_periodontograma
    ADD COLUMN IF NOT EXISTS margen_mv INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margen_v INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margen_dv INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margen_ml INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margen_l INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margen_dl INTEGER NOT NULL DEFAULT 0;

-- Cada medicion guardada queda aqui para comparar el estado periodontal entre fechas.
CREATE TABLE IF NOT EXISTS salud_periodontograma_historial (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    diente_fdi INTEGER NOT NULL,
    sondaje_mv INTEGER NOT NULL,
    sondaje_v INTEGER NOT NULL,
    sondaje_dv INTEGER NOT NULL,
    sondaje_ml INTEGER NOT NULL,
    sondaje_l INTEGER NOT NULL,
    sondaje_dl INTEGER NOT NULL,
    margen_mv INTEGER NOT NULL DEFAULT 0,
    margen_v INTEGER NOT NULL DEFAULT 0,
    margen_dv INTEGER NOT NULL DEFAULT 0,
    margen_ml INTEGER NOT NULL DEFAULT 0,
    margen_l INTEGER NOT NULL DEFAULT 0,
    margen_dl INTEGER NOT NULL DEFAULT 0,
    sangrado_bop BOOLEAN NOT NULL DEFAULT FALSE,
    placa BOOLEAN NOT NULL DEFAULT FALSE,
    movilidad INTEGER NOT NULL DEFAULT 0,
    furca INTEGER NOT NULL DEFAULT 0,
    usuario VARCHAR(100),
    fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_periodonto_historial_paciente
ON salud_periodontograma_historial (tenant_id, paciente_id, fecha_registro DESC);

-- Las mediciones vigentes pasan a ser la primera entrada del historial.
INSERT INTO salud_periodontograma_historial (
    tenant_id, paciente_id, diente_fdi,
    sondaje_mv, sondaje_v, sondaje_dv, sondaje_ml, sondaje_l, sondaje_dl,
    sangrado_bop, placa, movilidad, furca, fecha_registro)
SELECT tenant_id, paciente_id, diente_fdi,
    sondaje_mv, sondaje_v, sondaje_dv, sondaje_ml, sondaje_l, sondaje_dl,
    sangrado_bop, placa, movilidad, furca, fecha_registro
FROM salud_periodontograma;

-- 2. Recetas odontologicas.
CREATE TABLE IF NOT EXISTS salud_odontologia_recetas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    odontologo VARCHAR(100) NOT NULL,
    diagnostico TEXT,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    indicaciones TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recetas_odontologia_paciente
ON salud_odontologia_recetas (tenant_id, paciente_id, fecha_registro DESC);

-- 3. Consentimientos informados. El texto se guarda tal cual lo leyo el paciente
--    y la fila no se modifica despues de firmada.
CREATE TABLE IF NOT EXISTS salud_odontologia_consentimientos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    texto TEXT NOT NULL,
    diente_fdi INTEGER,
    firmante_nombre VARCHAR(150) NOT NULL,
    firmante_identificacion VARCHAR(50),
    firmante_relacion VARCHAR(50) NOT NULL DEFAULT 'PACIENTE',
    firma_png TEXT NOT NULL,
    odontologo VARCHAR(100) NOT NULL,
    fecha_firma TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consentimientos_odontologia_paciente
ON salud_odontologia_consentimientos (tenant_id, paciente_id, fecha_firma DESC);
