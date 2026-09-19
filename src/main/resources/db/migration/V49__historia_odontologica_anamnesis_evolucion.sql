-- V49: Historia Odontologica Especializada
-- Anamnesis de Riesgo Quirurgico (Alergias a anestesia, anticoagulantes, profilaxis)
-- y Bitacora de Evolucion Clinica por Sesion en Sillon.

-- 1. Ficha de Anamnesis y Riesgo Quirurgico Odontologico
CREATE TABLE IF NOT EXISTS salud_odontologia_anamnesis_riesgo (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    -- Alertas criticas en sillon
    alergia_anestesia BOOLEAN NOT NULL DEFAULT FALSE,
    detalle_alergias TEXT,
    toma_anticoagulantes BOOLEAN NOT NULL DEFAULT FALSE, -- Aspirina, Warfarina, Clopidogrel
    profilaxis_antibiotica_requerida BOOLEAN NOT NULL DEFAULT FALSE, -- Cardiopatias, Valvulopatias
    trastorno_coagulacion BOOLEAN NOT NULL DEFAULT FALSE,
    hipertension BOOLEAN NOT NULL DEFAULT FALSE,
    diabetes BOOLEAN NOT NULL DEFAULT FALSE,
    embarazo_lactancia BOOLEAN NOT NULL DEFAULT FALSE,
    -- Habitos y estomatologia
    bruxismo_atm BOOLEAN NOT NULL DEFAULT FALSE,
    tabaquismo BOOLEAN NOT NULL DEFAULT FALSE,
    observaciones_medicas TEXT,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_anamnesis_paciente UNIQUE (tenant_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_anamnesis_odontologia_tenant_paciente 
ON salud_odontologia_anamnesis_riesgo (tenant_id, paciente_id);

-- 2. Bitacora de Evolucion Clinica por Sesion (Diario de Sillon)
CREATE TABLE IF NOT EXISTS salud_odontologia_evolucion_sesiones (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    fecha_sesion DATE NOT NULL DEFAULT CURRENT_DATE,
    diente_fdi INTEGER,
    procedimiento_realizado VARCHAR(255) NOT NULL,
    tecnica_aislamiento VARCHAR(80) DEFAULT 'ABSOLUTO_DIQUE', -- ABSOLUTO_DIQUE, RELATIVO_ALGODON, NINGUNO
    anestesia_administrada VARCHAR(150), -- Ej: 1 carpule Lidocaina 2% con epinefrina 1:100.000
    conductometria_notas TEXT, -- Longitud de trabajo, calibre limas, fresas
    medicacion_indicada TEXT, -- Analgesicos prescritos
    proxima_cita_conducta TEXT, -- Plan para la siguiente sesion
    odontologo VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evolucion_odontologia_tenant_paciente 
ON salud_odontologia_evolucion_sesiones (tenant_id, paciente_id, fecha_sesion DESC);
