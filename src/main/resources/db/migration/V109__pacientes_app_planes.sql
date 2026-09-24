-- V109: Mediclinic Pacientes - plan que el medico comparte con el paciente.
-- Es una COPIA de lo que el medico decidio mostrar en ese momento (plan, indicaciones,
-- recipe, examenes a realizar y, si quiere, el diagnostico). Nunca incluye las
-- anotaciones privadas, y lo que el medico cambie despues en la consulta no se filtra
-- a la app hasta que vuelva a compartir.
CREATE TABLE IF NOT EXISTS app_pacientes_planes_compartidos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    consulta_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    fecha_consulta TIMESTAMP NOT NULL,
    diagnostico TEXT,
    plan_tratamiento TEXT,
    indicaciones TEXT,
    recipe TEXT,
    examenes_indicados TEXT,
    compartido_por VARCHAR(100),
    compartido_en TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_app_plan_consulta UNIQUE (tenant_id, consulta_id)
);
CREATE INDEX IF NOT EXISTS idx_app_planes_paciente ON app_pacientes_planes_compartidos (tenant_id, paciente_id);
