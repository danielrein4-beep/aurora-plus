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
--
-- Integridad referencial (hallazgo de la revisión de Codex): la primera versión de esta
-- migración solo declaraba columnas *_id como BIGINT sueltos, sin FK real — nada impedía en la
-- base de datos que una AsignacionEmpleado apuntara a un cargo_id inexistente o de otro tenant
-- (el aislamiento dependía 100% de que cada service recordara validar tenantId en Java). Ahora
-- cada FK exige que la fila referenciada exista; el aislamiento por tenant lo sigue validando
-- cada service explícitamente ANTES de relacionar dos filas (una FK de Postgres no sabe qué es
-- "tenant_id", solo que el id exista en algún tenant) — ver EmpleadoService.asignarCargo,
-- AsistenciaService.registrarEntrada, TurnoPersonalService.crear, MetaPersonalService.crear y
-- ReglaNominaService.crearNuevaVersion.

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
    empleado_id BIGINT NOT NULL REFERENCES personal_empleados(id),
    cargo_id BIGINT NOT NULL REFERENCES cargos_personal(id),
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
    empleado_id BIGINT NOT NULL REFERENCES personal_empleados(id),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);
CREATE INDEX idx_turnos_personal_tenant ON turnos_personal(tenant_id);

-- marcador_entrada_abierta (hardening de asistencia/concurrencia, revisión pre-piloto): vale
-- empleado_id mientras el registro sigue abierto (fecha_hora_salida IS NULL) y NULL en cuanto se
-- cierra. El UNIQUE sobre (tenant_id, marcador_entrada_abierta) es la garantía real contra dos
-- entradas abiertas simultáneas del mismo empleado bajo solicitudes concurrentes — un UNIQUE
-- estándar trata cada NULL como distinto de cualquier otro, así que los registros ya cerrados
-- nunca compiten entre sí. Ver AsistenciaService.registrarEntrada.
CREATE TABLE personal_registros_asistencia (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL REFERENCES personal_empleados(id),
    turno_id BIGINT REFERENCES turnos_personal(id),
    fecha_hora_entrada TIMESTAMP NOT NULL,
    fecha_hora_salida TIMESTAMP,
    origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    marcador_entrada_abierta BIGINT,
    CONSTRAINT uq_personal_asistencia_entrada_abierta UNIQUE (tenant_id, marcador_entrada_abierta)
);
CREATE INDEX idx_personal_registros_asistencia_tenant_empleado ON personal_registros_asistencia(tenant_id, empleado_id);

CREATE TABLE metas_personal (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL REFERENCES personal_empleados(id),
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
    meta_id BIGINT NOT NULL REFERENCES metas_personal(id),
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
    concepto_id BIGINT REFERENCES conceptos_nomina(id),
    tipo_regla VARCHAR(60) NOT NULL,
    valor_numerico NUMERIC(18,6) NOT NULL,
    moneda VARCHAR(3),
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE,
    creado_por BIGINT
);
CREATE INDEX idx_reglas_nomina_tenant_tipo ON reglas_nomina_versionadas(tenant_id, tipo_regla);
CREATE INDEX idx_reglas_nomina_tenant_concepto ON reglas_nomina_versionadas(tenant_id, concepto_id);
-- Cierra el hallazgo de "dos deducciones porcentuales se invalidan mutuamente": nunca puede
-- haber DOS filas simultáneamente abiertas (vigencia_hasta IS NULL) para la misma combinación
-- exacta de concepto_id + tipo_regla. Un índice UNIQUE normal trata cada NULL como distinto de
-- cualquier otro NULL (dos reglas generales con concepto_id NULL nunca chocarían) — se usa
-- COALESCE(concepto_id, 0) para que las reglas generales sí compitan entre sí por tipo_regla,
-- igual que las de concepto (0 nunca es un id real, ver BIGSERIAL empezando en 1).
CREATE UNIQUE INDEX uq_regla_nomina_abierta_por_concepto_tipo
    ON reglas_nomina_versionadas (tenant_id, COALESCE(concepto_id, 0), tipo_regla)
    WHERE vigencia_hasta IS NULL;

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
-- version propio: protege ajustes/reversos concurrentes sobre la MISMA nómina (ver
-- AjusteNominaService).
CREATE TABLE nominas_empleado (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL REFERENCES periodos_nomina(id),
    empleado_id BIGINT NOT NULL REFERENCES personal_empleados(id),
    asignacion_empleado_id BIGINT NOT NULL REFERENCES asignaciones_empleado(id),
    total_asignaciones NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_deducciones NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_aportes_patronales NUMERIC(18,2) NOT NULL DEFAULT 0,
    neto_a_pagar NUMERIC(18,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL,
    monto_equivalente_base NUMERIC(18,2),
    moneda_base_equivalente VARCHAR(3),
    tasa_aplicada NUMERIC(18,6),
    estado VARCHAR(20) NOT NULL DEFAULT 'CALCULADA',
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_nomina_empleado_periodo UNIQUE (tenant_id, periodo_id, empleado_id)
);
CREATE INDEX idx_nominas_empleado_tenant_periodo ON nominas_empleado(tenant_id, periodo_id);
CREATE INDEX idx_nominas_empleado_tenant_empleado ON nominas_empleado(tenant_id, empleado_id);

CREATE TABLE detalles_nomina (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nomina_empleado_id BIGINT NOT NULL REFERENCES nominas_empleado(id),
    concepto_id BIGINT REFERENCES conceptos_nomina(id),
    regla_aplicada_id BIGINT REFERENCES reglas_nomina_versionadas(id),
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
    nomina_empleado_id BIGINT NOT NULL REFERENCES nominas_empleado(id),
    tipo VARCHAR(20) NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    monto_ajuste NUMERIC(18,2),
    moneda VARCHAR(3),
    nomina_empleado_reemplazo_id BIGINT REFERENCES nominas_empleado(id),
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
    empleado_id BIGINT REFERENCES personal_empleados(id),
    CONSTRAINT uq_permiso_personal_usuario UNIQUE (tenant_id, usuario_id)
);

-- detalle NUNCA lleva montos ni datos salariales (docs/personal-nomina-contract.md §1.4).
-- entidad_id es una referencia polimórfica (puede apuntar a Empleado, PeriodoNomina, etc. según
-- "entidad") — no lleva FK real por el mismo motivo que MovimientoCaja.referenciaId en
-- core.financiero: apunta a tablas distintas según el valor de "entidad".
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
