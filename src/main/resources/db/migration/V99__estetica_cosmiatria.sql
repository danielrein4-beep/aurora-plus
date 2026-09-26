-- Estetica y Cosmiatria: vertical propia que reutiliza pacientes, agenda, servicios y caja de
-- salud (una clienta es un salud_pacientes), y agrega solo lo que el rubro necesita.

-- 1. Ficha de piel. Una por clienta. BASICO para spa/cosmetologia, DETALLADO para cosmiatria.
CREATE TABLE IF NOT EXISTS salud_estetica_ficha (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    nivel VARCHAR(20) NOT NULL DEFAULT 'BASICO',
    fototipo VARCHAR(5),
    biotipo VARCHAR(30),
    sensibilidad VARCHAR(20),
    lesiones VARCHAR(500),
    zonas_afectadas VARCHAR(500),
    objetivo TEXT,
    rutina_domiciliaria TEXT,
    exposicion_solar VARCHAR(20),
    medicacion_actual TEXT,
    alergias_cosmeticos TEXT,
    usa_isotretinoina BOOLEAN NOT NULL DEFAULT false,
    embarazo_lactancia BOOLEAN NOT NULL DEFAULT false,
    herpes_recurrente BOOLEAN NOT NULL DEFAULT false,
    marcapasos_implantes BOOLEAN NOT NULL DEFAULT false,
    derivar_dermatologo BOOLEAN NOT NULL DEFAULT false,
    observaciones TEXT,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_estetica_ficha_paciente UNIQUE (tenant_id, paciente_id)
);

-- 2. Paquetes o bonos de sesiones (ej. 10 sesiones de radiofrecuencia).
CREATE TABLE IF NOT EXISTS salud_estetica_paquetes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    nombre VARCHAR(150) NOT NULL,
    sesiones_total INTEGER NOT NULL CHECK (sesiones_total > 0),
    sesiones_usadas INTEGER NOT NULL DEFAULT 0 CHECK (sesiones_usadas >= 0),
    precio NUMERIC(14, 2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL DEFAULT 'USD',
    fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    cobro_id BIGINT,
    notas TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_estetica_paquete_saldo CHECK (sesiones_usadas <= sesiones_total)
);
CREATE INDEX IF NOT EXISTS idx_estetica_paquetes_paciente ON salud_estetica_paquetes (tenant_id, paciente_id);
CREATE INDEX IF NOT EXISTS idx_estetica_paquetes_estado ON salud_estetica_paquetes (tenant_id, estado);

-- 3. Sesiones realizadas, con fotos de antes y despues (data-URI, se piden aparte al abrirlas).
CREATE TABLE IF NOT EXISTS salud_estetica_sesiones (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    paquete_id BIGINT REFERENCES salud_estetica_paquetes(id),
    fecha_sesion DATE NOT NULL DEFAULT CURRENT_DATE,
    servicio VARCHAR(150) NOT NULL,
    zona VARCHAR(150),
    parametros TEXT,
    productos TEXT,
    reaccion TEXT,
    indicaciones TEXT,
    proxima_sesion DATE,
    profesional VARCHAR(150),
    foto_antes TEXT,
    foto_despues TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estetica_sesiones_paciente ON salud_estetica_sesiones (tenant_id, paciente_id, fecha_sesion DESC);

-- 4. Consentimientos firmados. El texto se guarda tal cual lo leyo la clienta.
CREATE TABLE IF NOT EXISTS salud_estetica_consentimientos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NOT NULL REFERENCES salud_pacientes(id),
    procedimiento VARCHAR(150) NOT NULL,
    texto TEXT NOT NULL,
    nombre_firmante VARCHAR(150) NOT NULL,
    identificacion_firmante VARCHAR(30),
    firma TEXT NOT NULL,
    profesional VARCHAR(150),
    fecha_firma TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estetica_consentimientos_paciente ON salud_estetica_consentimientos (tenant_id, paciente_id);
