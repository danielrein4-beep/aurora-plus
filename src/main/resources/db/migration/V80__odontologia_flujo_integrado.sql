-- V80: Odontologia - flujo integrado
-- 1. Caras dentales como arreglo JSON (antes quedaban embebidas en el texto de notas).
-- 2. Historial del odontograma para comparar el estado de cada pieza entre fechas.
-- 3. Abonos de planes de tratamiento enlazados al cobro real de caja.

-- 1. caras_json nacio con default '{}' (objeto) pero la app lo usa como arreglo de caras.
UPDATE salud_odontograma_dientes
SET caras_json = '[]'::jsonb
WHERE caras_json IS NULL OR jsonb_typeof(caras_json) <> 'array';

ALTER TABLE salud_odontograma_dientes ALTER COLUMN caras_json SET DEFAULT '[]'::jsonb;

-- 2. Historial: una fila por cada cambio guardado en una pieza.
CREATE TABLE IF NOT EXISTS salud_odontograma_historial (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    numero_fdi INTEGER NOT NULL,
    estado VARCHAR(30) NOT NULL,
    caras_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    notas TEXT,
    usuario VARCHAR(100),
    fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odontograma_historial_paciente
ON salud_odontograma_historial (tenant_id, paciente_id, fecha_registro DESC);

-- El estado vigente de cada pieza pasa a ser el punto de partida del historial.
INSERT INTO salud_odontograma_historial (tenant_id, paciente_id, numero_fdi, estado, caras_json, notas, usuario, fecha_registro)
SELECT tenant_id, paciente_id, numero_fdi, estado, caras_json, notas, NULL, fecha_actualizacion
FROM salud_odontograma_dientes;

-- 3. Abonos: cada pago a un plan queda enlazado al cobro de salud (y por ende a caja).
CREATE TABLE IF NOT EXISTS salud_odontologia_plan_abonos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL REFERENCES salud_odontologia_planes_tratamiento(id) ON DELETE CASCADE,
    cobro_id BIGINT NOT NULL REFERENCES salud_cobros_consulta(id),
    monto_usd NUMERIC(12, 2) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_plan_abono_cobro UNIQUE (cobro_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_abonos_tenant_plan
ON salud_odontologia_plan_abonos (tenant_id, plan_id);
