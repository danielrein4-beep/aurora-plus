-- V48: Suite Odontologica Avanzada
-- Periodontograma con sondaje de 6 puntos, planes de tratamiento por fases,
-- recetas/kits de insumos con descarga automatica, agenda por sillon y radiografias.

-- 1. Caras dentales en odontograma
ALTER TABLE salud_odontograma_dientes 
ADD COLUMN IF NOT EXISTS caras_json JSONB DEFAULT '{}'::jsonb;

-- 2. Periodontograma por diente y puntos de sondaje milimetrico
CREATE TABLE IF NOT EXISTS salud_periodontograma (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    diente_fdi INTEGER NOT NULL,
    -- Mediciones vestibulares (mm)
    sondaje_mv INTEGER NOT NULL DEFAULT 1,
    sondaje_v INTEGER NOT NULL DEFAULT 1,
    sondaje_dv INTEGER NOT NULL DEFAULT 1,
    -- Mediciones linguales/palatinas (mm)
    sondaje_ml INTEGER NOT NULL DEFAULT 1,
    sondaje_l INTEGER NOT NULL DEFAULT 1,
    sondaje_dl INTEGER NOT NULL DEFAULT 1,
    -- Factores clinicos
    sangrado_bop BOOLEAN NOT NULL DEFAULT FALSE,
    placa BOOLEAN NOT NULL DEFAULT FALSE,
    movilidad INTEGER NOT NULL DEFAULT 0, -- 0: Normal, 1: Leve, 2: Moderada, 3: Severa
    furca INTEGER NOT NULL DEFAULT 0,     -- 0: No, 1: Grado I, 2: Grado II, 3: Grado III
    notas TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_periodontograma_paciente_diente UNIQUE (paciente_id, diente_fdi)
);

CREATE INDEX IF NOT EXISTS idx_periodontograma_tenant_paciente 
ON salud_periodontograma (tenant_id, paciente_id);

-- 3. Planes de Tratamiento y Presupuestacion por Fases
CREATE TABLE IF NOT EXISTS salud_odontologia_planes_tratamiento (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    nombre_plan VARCHAR(150) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROPUESTO', -- PROPUESTO, APROBADO, EN_CURSO, COMPLETADO, CANCELADO
    monto_total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_total_ves NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    monto_pagado_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notas TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    fecha_aprobacion TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planes_odontologia_tenant_paciente 
ON salud_odontologia_planes_tratamiento (tenant_id, paciente_id);

-- Items de los planes de tratamiento (por diente/fase)
CREATE TABLE IF NOT EXISTS salud_odontologia_plan_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL REFERENCES salud_odontologia_planes_tratamiento(id) ON DELETE CASCADE,
    fase VARCHAR(50) NOT NULL DEFAULT 'FASE_1_HIGIENE', -- FASE_1_HIGIENE, FASE_2_QUIRURGICA, FASE_3_REHABILITACION
    diente_fdi INTEGER,
    cara VARCHAR(20),
    procedimiento VARCHAR(150) NOT NULL,
    costo_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, EN_PROCESO, REALIZADO, ANULADO
    fecha_realizado TIMESTAMP,
    odontologo_responsable VARCHAR(100),
    kit_descargado BOOLEAN NOT NULL DEFAULT FALSE,
    notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_plan_items_tenant_plan 
ON salud_odontologia_plan_items (tenant_id, plan_id);

-- 4. Kits de insumos por procedimiento (recetas de consumo automatico)
CREATE TABLE IF NOT EXISTS salud_odontologia_kits_procedimientos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    procedimiento_clave VARCHAR(100) NOT NULL,
    nombre_kit VARCHAR(150) NOT NULL,
    insumos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_kit_tenant_procedimiento UNIQUE (tenant_id, procedimiento_clave)
);

-- 5. Agenda Multidimensional (Sillon/Box + Especialista + Paciente)
CREATE TABLE IF NOT EXISTS salud_odontologia_citas_agenda (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    odontologo VARCHAR(100) NOT NULL,
    especialidad VARCHAR(80) NOT NULL DEFAULT 'ODONTOLOGIA_GENERAL',
    sillon_box VARCHAR(50) NOT NULL DEFAULT 'SILLON_1', -- SILLON_1, SILLON_2, SILLON_3, BOX_QUIRURGICO
    fecha_cita DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA', -- PROGRAMADA, CONFIRMADA, EN_SALA, EN_ATENCION, COMPLETADA, CANCELADA
    recordatorio_whatsapp_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    notas TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_odontologia_fecha_sillon 
ON salud_odontologia_citas_agenda (tenant_id, fecha_cita, sillon_box);

-- 6. Imagenologia y Radiografias Dentales
CREATE TABLE IF NOT EXISTS salud_odontologia_radiografias (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    tipo_estudio VARCHAR(50) NOT NULL, -- PANORAMICA, PERIAPICAL, BITEWING, CEFALOMETRICA, FOTOGRAFIA_CLINICA
    titulo VARCHAR(150) NOT NULL,
    url_archivo TEXT NOT NULL,
    hallazgos TEXT,
    diente_asociado INTEGER,
    fecha_toma DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radiografias_tenant_paciente 
ON salud_odontologia_radiografias (tenant_id, paciente_id);

-- Seed de kits estandar de insumos para tenant 1 de demostracion
INSERT INTO salud_odontologia_kits_procedimientos (tenant_id, procedimiento_clave, nombre_kit, insumos_json)
VALUES 
(1, 'RESINA_SIMPLE', 'Kit Resina Compuesta Simple', '[
    {"nombre": "Resina Microhibrida A2/A3", "cantidad": 0.5, "unidad": "Gramos"},
    {"nombre": "Cartucho Anestesia Lidocaina 2%", "cantidad": 1.0, "unidad": "Carpule"},
    {"nombre": "Aguja Dental Corta 30G", "cantidad": 1.0, "unidad": "Unidad"},
    {"nombre": "Acido Grabador Fosforico 37%", "cantidad": 0.2, "unidad": "ml"},
    {"nombre": "Adhesivo Dental Universal", "cantidad": 1.0, "unidad": "Gota"}
]'::jsonb),
(1, 'ENDODONCIA_UNIRRADICULAR', 'Kit Endodoncia Unirradicular', '[
    {"nombre": "Cartucho Anestesia Mepivacaina 3%", "cantidad": 2.0, "unidad": "Carpule"},
    {"nombre": "Aguja Dental Larga 27G", "cantidad": 1.0, "unidad": "Unidad"},
    {"nombre": "Solucion Irrigante Hipoclorito 5.25%", "cantidad": 10.0, "unidad": "ml"},
    {"nombre": "Conos Gutapercha Primera Serie", "cantidad": 3.0, "unidad": "Puntas"},
    {"nombre": "Cemento Sellador Endodontico", "cantidad": 0.3, "unidad": "Dosis"}
]'::jsonb),
(1, 'EXODONCIA_SIMPLE', 'Kit Exodoncia y Cirugia Menor', '[
    {"nombre": "Cartucho Anestesia Articaina 4%", "cantidad": 2.0, "unidad": "Carpule"},
    {"nombre": "Hoja de Bisturi No. 15", "cantidad": 1.0, "unidad": "Unidad"},
    {"nombre": "Sutura Seda Negra 3-0 con Aguja", "cantidad": 1.0, "unidad": "Sobre"},
    {"nombre": "Gasas Esteriles 5x5", "cantidad": 4.0, "unidad": "Unidades"}
]'::jsonb),
(1, 'PROFILAXIS_DESTARTRAJE', 'Kit Higiene y Profilaxis Ultrasonica', '[
    {"nombre": "Pasta Profilactica con Fluor", "cantidad": 1.0, "unidad": "Dosis"},
    {"nombre": "Copa de Goma para Profilaxis", "cantidad": 1.0, "unidad": "Unidad"},
    {"nombre": "Enjuague Clorhexidina 0.12%", "cantidad": 15.0, "unidad": "ml"},
    {"nombre": "Eyector de Saliva Desechable", "cantidad": 1.0, "unidad": "Unidad"}
]'::jsonb)
ON CONFLICT (tenant_id, procedimiento_clave) DO NOTHING;
