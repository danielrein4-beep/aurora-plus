-- V108: Mediclinic Pacientes (app gratis para pacientes, repo aurora-pacientes).
-- El paciente de la app NO pertenece a ningun tenant: tiene su propia cuenta y se
-- relaciona con los consultorios de Salud a traves de solicitudes de cita y vinculos.
-- Todo esto queda inactivo mientras aurora.pacientes-app.habilitada=false.

CREATE TABLE IF NOT EXISTS app_pacientes (
    id BIGSERIAL PRIMARY KEY,
    -- Cedula normalizada: letra + digitos, sin puntos ni guiones (V24815678).
    cedula VARCHAR(20) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    -- Se incrementa para cerrar todas las sesiones abiertas del paciente.
    token_version INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMP NOT NULL DEFAULT now(),
    ultimo_acceso TIMESTAMP,
    CONSTRAINT uq_app_pacientes_cedula UNIQUE (cedula)
);

-- Codigos de entrada por WhatsApp. Solo se guarda el hash SHA-256 del codigo.
CREATE TABLE IF NOT EXISTS app_pacientes_codigos (
    id BIGSERIAL PRIMARY KEY,
    cedula VARCHAR(20) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    -- Solo al crear cuenta: el nombre que escribio el paciente.
    nombre VARCHAR(150),
    codigo_hash CHAR(64) NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    intentos INTEGER NOT NULL DEFAULT 0,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_pacientes_codigos_cedula ON app_pacientes_codigos (cedula, creado_en);

-- Perfil publico de cada consultorio de Salud en el directorio de la app.
-- Un consultorio solo aparece si publicado = TRUE (lo decide la clinica).
CREATE TABLE IF NOT EXISTS app_pacientes_perfil_consultorio (
    tenant_id BIGINT PRIMARY KEY,
    publicado BOOLEAN NOT NULL DEFAULT FALSE,
    trato VARCHAR(5) NOT NULL DEFAULT 'Dr.',
    especialidad VARCHAR(40) NOT NULL DEFAULT 'general',
    ciudad VARCHAR(80),
    precio_consulta NUMERIC(18, 2),
    moneda VARCHAR(10) NOT NULL DEFAULT 'USD',
    anios_experiencia INTEGER,
    bio TEXT,
    acepta_mensajes BOOLEAN NOT NULL DEFAULT FALSE,
    -- TRUE: la solicitud se vuelve cita al instante si el horario esta libre.
    confirmacion_automatica BOOLEAN NOT NULL DEFAULT FALSE,
    hora_inicio TIME NOT NULL DEFAULT '08:00',
    hora_fin TIME NOT NULL DEFAULT '17:00',
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    -- Dias de atencion, 1 = lunes ... 7 = domingo.
    dias_atencion VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
    actualizado_en TIMESTAMP NOT NULL DEFAULT now()
);

-- Solicitudes de cita hechas desde la app. Al aceptarlas se crea la cita en salud_citas.
CREATE TABLE IF NOT EXISTS app_pacientes_solicitudes_cita (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_app_id BIGINT NOT NULL REFERENCES app_pacientes(id),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    motivo VARCHAR(255),
    estado VARCHAR(20) NOT NULL DEFAULT 'SOLICITADA',
    cita_id BIGINT,
    respuesta VARCHAR(255),
    respondido_por VARCHAR(100),
    creado_en TIMESTAMP NOT NULL DEFAULT now(),
    respondido_en TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_app_solicitudes_tenant_estado ON app_pacientes_solicitudes_cita (tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_app_solicitudes_paciente ON app_pacientes_solicitudes_cita (paciente_app_id);
-- Dos pacientes no pueden tener pendiente la misma hora del mismo consultorio.
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_solicitud_pendiente_hora
    ON app_pacientes_solicitudes_cita (tenant_id, fecha, hora_inicio) WHERE estado = 'SOLICITADA';

-- Vinculo entre la cuenta de la app y el paciente de un consultorio (salud_pacientes).
CREATE TABLE IF NOT EXISTS app_pacientes_vinculos (
    id BIGSERIAL PRIMARY KEY,
    paciente_app_id BIGINT NOT NULL REFERENCES app_pacientes(id),
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    creado_en TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_app_vinculo UNIQUE (paciente_app_id, tenant_id)
);
