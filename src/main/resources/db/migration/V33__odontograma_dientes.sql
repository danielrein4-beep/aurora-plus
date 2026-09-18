-- Mediclinic Odonto: odontograma diente-por-diente en notación FDI. Un solo
-- registro vigente por (paciente, numero_fdi) que se sobreescribe (upsert),
-- sin historial por ahora — mismo criterio de simplicidad que el resto del
-- núcleo clínico.
CREATE TABLE salud_odontograma_dientes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    numero_fdi INTEGER NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'SANO',
    notas TEXT,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_odontograma_paciente_diente UNIQUE (paciente_id, numero_fdi)
);

CREATE INDEX idx_odontograma_tenant_paciente ON salud_odontograma_dientes (tenant_id, paciente_id);
