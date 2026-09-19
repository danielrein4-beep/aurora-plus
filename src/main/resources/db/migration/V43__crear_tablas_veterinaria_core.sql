-- =============================================================================
-- Migracion Flyway V12: Tablas Core de la Vertical Veterinaria (Aurora Vet)
-- =============================================================================

-- 1. Propietarios (Dueños de mascotas)
CREATE TABLE IF NOT EXISTS propietarios (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    identificacion VARCHAR(30) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_vet_propietario_tenant_ident ON propietarios(tenant_id, identificacion);
CREATE INDEX IF NOT EXISTS idx_vet_propietario_tenant ON propietarios(tenant_id);

-- 2. Mascotas (Pacientes veterinarios)
CREATE TABLE IF NOT EXISTS mascotas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    propietario_id BIGINT NOT NULL REFERENCES propietarios(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    especie VARCHAR(30) NOT NULL, -- PERRO, GATO, AVE, EXOTICO, OTRO
    raza VARCHAR(100),
    sexo VARCHAR(20),
    fecha_nacimiento DATE,
    edad_estimada VARCHAR(50),
    color_senas VARCHAR(150),
    peso_actual_kg NUMERIC(6, 2),
    microchip VARCHAR(50),
    esterilizado BOOLEAN NOT NULL DEFAULT FALSE,
    alergias TEXT,
    antecedentes_patologicos TEXT,
    fallecido BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_vet_mascotas_tenant ON mascotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vet_mascotas_propietario ON mascotas(tenant_id, propietario_id);
CREATE INDEX IF NOT EXISTS idx_vet_mascotas_microchip ON mascotas(tenant_id, microchip);

-- 3. Consultas Veterinarias
CREATE TABLE IF NOT EXISTS consultas_veterinarias (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    mascota_id BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE RESTRICT,
    cita_id BIGINT,
    veterinario_id BIGINT,
    veterinario_nombre VARCHAR(150),
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    motivo_consulta VARCHAR(255) NOT NULL,
    enfermedad_actual TEXT,
    examen_fisico TEXT,
    evolucion_clinica TEXT,
    evolucion_estado VARCHAR(20), -- MEJORO, IGUAL, EMPEORO
    frecuencia_cardiaca INTEGER,
    frecuencia_respiratoria INTEGER,
    temperatura NUMERIC(4, 1),
    peso_kg NUMERIC(6, 2),
    condicion_corporal INTEGER, -- Escala 1-9 (Body Condition Score)
    diagnostico_principal VARCHAR(255),
    descripcion_diagnostico TEXT,
    diagnosticos_secundarios TEXT,
    plan_tratamiento TEXT,
    recipe_medicamentos TEXT,
    indicaciones_generales TEXT,
    orden_examenes TEXT,
    anotaciones_privadas TEXT
);
CREATE INDEX IF NOT EXISTS idx_vet_consultas_tenant_mascota ON consultas_veterinarias(tenant_id, mascota_id);
CREATE INDEX IF NOT EXISTS idx_vet_consultas_tenant ON consultas_veterinarias(tenant_id);

-- 4. Citas Veterinarias
CREATE TABLE IF NOT EXISTS citas_veterinarias (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    mascota_id BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE RESTRICT,
    veterinario_id BIGINT NOT NULL,
    veterinario_nombre VARCHAR(150),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    especialidad VARCHAR(100),
    motivo VARCHAR(255),
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    costo_estimado NUMERIC(18, 2),
    moneda VARCHAR(10) DEFAULT 'USD',
    notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_vet_citas_tenant_vet_fecha ON citas_veterinarias(tenant_id, veterinario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_vet_citas_tenant_mascota ON citas_veterinarias(tenant_id, mascota_id);

-- 5. Cobros de Consulta / Servicios Veterinarios (Integrado a Caja Multi-Moneda)
CREATE TABLE IF NOT EXISTS cobros_consulta_vet (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    clave_idempotencia VARCHAR(100) NOT NULL,
    mascota_id BIGINT REFERENCES mascotas(id) ON DELETE SET NULL,
    propietario_id BIGINT REFERENCES propietarios(id) ON DELETE SET NULL,
    consulta_id BIGINT,
    cita_id BIGINT,
    procedimiento_id BIGINT,
    concepto VARCHAR(255) NOT NULL,
    monto_total NUMERIC(18, 2) NOT NULL,
    moneda_cobrada VARCHAR(10) NOT NULL DEFAULT 'USD',
    monto_recibido NUMERIC(18, 2) NOT NULL,
    moneda_pago VARCHAR(10) NOT NULL DEFAULT 'USD',
    tasa_cambio NUMERIC(18, 6),
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO',
    referencia_pago VARCHAR(100),
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    cajero_usuario VARCHAR(100),
    estado VARCHAR(30) NOT NULL DEFAULT 'PAGADO',
    movimiento_caja_id BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vet_cobro_tenant_idemp ON cobros_consulta_vet(tenant_id, clave_idempotencia);
CREATE INDEX IF NOT EXISTS idx_vet_cobro_tenant_mascota ON cobros_consulta_vet(tenant_id, mascota_id);

-- 6. Cierres de Caja Veterinarios
CREATE TABLE IF NOT EXISTS cierres_caja_vet (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    hora_cierre VARCHAR(20) NOT NULL,
    responsable_nombre VARCHAR(150),
    tasa_bcv NUMERIC(12, 4),
    tasa_cop NUMERIC(12, 4),
    total_usd NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_ves NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_cop NUMERIC(18, 2) DEFAULT 0.00,
    total_pacientes INTEGER NOT NULL DEFAULT 0,
    observaciones TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vet_cierre_tenant_fecha ON cierres_caja_vet(tenant_id, fecha);

-- 7. Procedimientos Veterinarios (Catálogo)
CREATE TABLE IF NOT EXISTS procedimientos_veterinarios (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    costo NUMERIC(18, 2) NOT NULL,
    moneda VARCHAR(10) NOT NULL DEFAULT 'USD',
    duracion_minutos INTEGER
);
CREATE INDEX IF NOT EXISTS idx_vet_proc_tenant ON procedimientos_veterinarios(tenant_id);

-- 8. Cotizaciones Veterinarias
CREATE TABLE IF NOT EXISTS cotizaciones_veterinarias (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    mascota_id BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE RESTRICT,
    procedimiento_nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    costo_usd NUMERIC(18, 2) NOT NULL,
    costo_ves NUMERIC(18, 2),
    costo_cop NUMERIC(18, 2),
    tasa_bcv NUMERIC(12, 4),
    tasa_cop NUMERIC(12, 4),
    estado VARCHAR(30) NOT NULL DEFAULT 'COTIZADA',
    fecha DATE NOT NULL,
    fecha_planificada DATE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vet_cotiz_tenant_mascota ON cotizaciones_veterinarias(tenant_id, mascota_id);

-- 9. Sala de Espera Veterinaria
CREATE TABLE IF NOT EXISTS sala_espera_vet (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    mascota_id BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE RESTRICT,
    cita_id BIGINT,
    veterinario_id BIGINT,
    veterinario_nombre VARCHAR(150),
    consultorio VARCHAR(50),
    hora_llegada TIMESTAMP NOT NULL DEFAULT NOW(),
    hora_llamado TIMESTAMP,
    hora_finalizacion TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'EN_ESPERA',
    prioridad VARCHAR(30) NOT NULL DEFAULT 'NORMAL'
);
CREATE INDEX IF NOT EXISTS idx_vet_sala_tenant_estado ON sala_espera_vet(tenant_id, estado);

-- 10. Bloqueos de Agenda Veterinaria
CREATE TABLE IF NOT EXISTS bloqueos_agenda_vet (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    veterinario_id BIGINT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    motivo VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vet_bloqueo_tenant_vet ON bloqueos_agenda_vet(tenant_id, veterinario_id, fecha_inicio, fecha_fin);
