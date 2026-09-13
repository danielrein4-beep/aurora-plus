-- Núcleo compartido de Personal y Aurora Nómina (docs/personal-nomina-contract.md).
-- Ninguna tabla referencia entidades de ninguna vertical (Comanda, VentaRetail, Animal,
-- Paciente...) — la conexión con cada vertical es una fase posterior, fuera de este alcance.
--
-- personal_empleados / personal_registros_asistencia (en vez de "empleados"/"registros_asistencia"
-- a secas): ya existen esos mismos nombres de tabla usados por modules.tamanacocomercial.entities.
-- Empleado y core.rrhh.entities.Empleado/RegistroAsistencia — un choque real encontrado al
-- integrar este módulo (core.rrhh no tiene ninguna migración propia que cree esas tablas, parece
-- código ya incompleto en esta rama, ver docs/personal-nomina-contract.md §6). El resto de las
-- tablas de este módulo no colisionaba con nada existente.

CREATE TABLE personal_empleados (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(30) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    fecha_egreso DATE,
    usuario_id BIGINT
);
CREATE INDEX idx_personal_empleados_tenant ON personal_empleados(tenant_id);

CREATE TABLE cargos_personal (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT
);
CREATE INDEX idx_cargos_personal_tenant ON cargos_personal(tenant_id);

CREATE TABLE asignaciones_empleado (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL,
    cargo_id BIGINT NOT NULL,
    modulo_origen VARCHAR(30),
    tipo_salario VARCHAR(20) NOT NULL,
    salario_pactado NUMERIC(18,2) NOT NULL,
    moneda_salario VARCHAR(3) NOT NULL,
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE
);
CREATE INDEX idx_asignaciones_empleado_tenant ON asignaciones_empleado(tenant_id);
CREATE INDEX idx_asignaciones_empleado_empleado ON asignaciones_empleado(empleado_id);

CREATE TABLE turnos_personal (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);
CREATE INDEX idx_turnos_personal_tenant ON turnos_personal(tenant_id);

CREATE TABLE personal_registros_asistencia (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL,
    turno_id BIGINT,
    fecha_hora_entrada TIMESTAMP NOT NULL,
    fecha_hora_salida TIMESTAMP,
    origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
);
CREATE INDEX idx_personal_registros_asistencia_tenant_empleado ON personal_registros_asistencia(tenant_id, empleado_id);

CREATE TABLE metas_personal (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    valor_objetivo NUMERIC(18,4) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL
);
CREATE INDEX idx_metas_personal_tenant_empleado ON metas_personal(tenant_id, empleado_id);

CREATE TABLE seguimientos_meta (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    meta_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    valor_alcanzado NUMERIC(18,4) NOT NULL,
    nota VARCHAR(500)
);
CREATE INDEX idx_seguimientos_meta_tenant_meta ON seguimientos_meta(tenant_id, meta_id);

CREATE TABLE conceptos_nomina (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_conceptos_nomina_tenant ON conceptos_nomina(tenant_id);

-- INMUTABLE (docs/personal-nomina-contract.md §3) — nunca se hace UPDATE sobre valor_numerico
-- de una fila existente, "editar" siempre inserta una fila nueva y cierra vigencia_hasta de la
-- anterior.
CREATE TABLE reglas_nomina_versionadas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    concepto_id BIGINT,
    tipo_regla VARCHAR(60) NOT NULL,
    valor_numerico NUMERIC(18,6) NOT NULL,
    moneda VARCHAR(3),
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE,
    creado_por BIGINT
);
CREATE INDEX idx_reglas_nomina_tenant_tipo ON reglas_nomina_versionadas(tenant_id, tipo_regla);
CREATE INDEX idx_reglas_nomina_tenant_concepto ON reglas_nomina_versionadas(tenant_id, concepto_id);

CREATE TABLE periodos_nomina (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    fecha_pago_planificada DATE,
    moneda VARCHAR(3) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    calculado_por BIGINT,
    fecha_calculo TIMESTAMP,
    aprobado_por BIGINT,
    fecha_aprobacion TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_periodos_nomina_tenant ON periodos_nomina(tenant_id);

-- UNIQUE(tenant_id, periodo_id, empleado_id): última línea de defensa contra dos hilos
-- calculando el mismo período a la vez (ver MotorNominaService y periodos_nomina.version arriba).
CREATE TABLE nominas_empleado (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL,
    asignacion_empleado_id BIGINT NOT NULL,
    total_asignaciones NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_deducciones NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_aportes_patronales NUMERIC(18,2) NOT NULL DEFAULT 0,
    neto_a_pagar NUMERIC(18,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL,
    monto_equivalente_base NUMERIC(18,2),
    moneda_base_equivalente VARCHAR(3),
    tasa_aplicada NUMERIC(18,6),
    estado VARCHAR(20) NOT NULL DEFAULT 'CALCULADA',
    CONSTRAINT uq_nomina_empleado_periodo UNIQUE (tenant_id, periodo_id, empleado_id)
);
CREATE INDEX idx_nominas_empleado_tenant_periodo ON nominas_empleado(tenant_id, periodo_id);
CREATE INDEX idx_nominas_empleado_tenant_empleado ON nominas_empleado(tenant_id, empleado_id);

CREATE TABLE detalles_nomina (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nomina_empleado_id BIGINT NOT NULL,
    concepto_id BIGINT,
    regla_aplicada_id BIGINT,
    descripcion VARCHAR(255) NOT NULL,
    cantidad NUMERIC(18,4),
    monto_unitario NUMERIC(18,4),
    monto_total NUMERIC(18,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL,
    tipo VARCHAR(20) NOT NULL
);
CREATE INDEX idx_detalles_nomina_tenant_nomina ON detalles_nomina(tenant_id, nomina_empleado_id);

CREATE TABLE ajustes_nomina (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nomina_empleado_id BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    monto_ajuste NUMERIC(18,2),
    moneda VARCHAR(3),
    nomina_empleado_reemplazo_id BIGINT,
    creado_por BIGINT NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_ajustes_nomina_tenant_nomina ON ajustes_nomina(tenant_id, nomina_empleado_id);

-- Sistema de roles PROPIO de este módulo, separado del rol operativo global de Usuario
-- (docs/personal-nomina-contract.md §1.2).
CREATE TABLE permisos_personal (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    rol VARCHAR(20) NOT NULL,
    empleado_id BIGINT,
    CONSTRAINT uq_permiso_personal_usuario UNIQUE (tenant_id, usuario_id)
);

-- detalle NUNCA lleva montos ni datos salariales (docs/personal-nomina-contract.md §1.4).
CREATE TABLE auditoria_personal (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    accion VARCHAR(60) NOT NULL,
    entidad VARCHAR(60) NOT NULL,
    entidad_id BIGINT,
    detalle VARCHAR(500),
    fecha TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_personal_tenant ON auditoria_personal(tenant_id);
