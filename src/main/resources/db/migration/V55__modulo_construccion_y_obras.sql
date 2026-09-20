-- =============================================================================
-- Migracion Flyway V55: Modulo de Ingenieria Civil, Obras y Construccion Pro
-- Estandarizado para presupuestos COVENIN, APU, valuaciones y libro diario
-- =============================================================================

-- 1. Proyectos Civiles y Obras
CREATE TABLE IF NOT EXISTS proyectos_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    cliente VARCHAR(255) NOT NULL,
    ubicacion VARCHAR(255),
    ingeniero_residente VARCHAR(150),
    civ_residente VARCHAR(50),
    fecha_inicio DATE,
    fecha_fin_estimada DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'EN_EJECUCION',
    monto_presupuesto_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    porcentaje_anticipo NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    porcentaje_retencion_garantia NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    porcentaje_administracion NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    porcentaje_utilidad NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    iva NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_proy_const_tenant ON proyectos_construccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proy_const_codigo ON proyectos_construccion(tenant_id, codigo);

-- 2. Capítulos de Obra (Obras Preliminares, Mov. Tierra, Estructuras, etc.)
CREATE TABLE IF NOT EXISTS capitulos_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    proyecto_id BIGINT REFERENCES proyectos_construccion(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cap_const_tenant ON capitulos_construccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_const_proy ON capitulos_construccion(proyecto_id);

-- 3. Partidas de Obra (Presupuesto contractual, cómputos y APU)
CREATE TABLE IF NOT EXISTS partidas_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    proyecto_id BIGINT NOT NULL REFERENCES proyectos_construccion(id) ON DELETE CASCADE,
    capitulo_id BIGINT REFERENCES capitulos_construccion(id) ON DELETE SET NULL,
    codigo_covenin VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    cantidad_presupuestada NUMERIC(14, 4) NOT NULL DEFAULT 0,
    precio_unitario NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cantidad_ejecutada_acumulada NUMERIC(14, 4) NOT NULL DEFAULT 0,
    costo_materiales NUMERIC(18, 2) DEFAULT 0,
    costo_equipos NUMERIC(18, 2) DEFAULT 0,
    costo_mano_obra NUMERIC(18, 2) DEFAULT 0,
    rendimiento_diario NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_part_const_tenant ON partidas_construccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_part_const_proy ON partidas_construccion(proyecto_id);

-- 4. Valuaciones de Obra (Cortes de avance financiero y físico)
CREATE TABLE IF NOT EXISTS valuaciones_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    proyecto_id BIGINT NOT NULL REFERENCES proyectos_construccion(id) ON DELETE CASCADE,
    numero_valuacion INT NOT NULL,
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    fecha_emision DATE NOT NULL,
    monto_bruto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    amortizacion_anticipo NUMERIC(18, 2) NOT NULL DEFAULT 0,
    retencion_fiel_cumplimiento NUMERIC(18, 2) NOT NULL DEFAULT 0,
    retencion_laboral NUMERIC(18, 2) NOT NULL DEFAULT 0,
    monto_subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,
    monto_iva NUMERIC(18, 2) NOT NULL DEFAULT 0,
    monto_neto_a_cobrar NUMERIC(18, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'BORRADOR',
    observaciones TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_val_const_tenant ON valuaciones_construccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_val_const_proy ON valuaciones_construccion(proyecto_id);

-- 5. Items de Valuación (Medición por partida)
CREATE TABLE IF NOT EXISTS items_valuacion_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    valuacion_id BIGINT NOT NULL REFERENCES valuaciones_construccion(id) ON DELETE CASCADE,
    partida_id BIGINT NOT NULL REFERENCES partidas_construccion(id) ON DELETE CASCADE,
    cantidad_anterior NUMERIC(14, 4) NOT NULL DEFAULT 0,
    cantidad_actual NUMERIC(14, 4) NOT NULL DEFAULT 0,
    cantidad_acumulada NUMERIC(14, 4) NOT NULL DEFAULT 0,
    monto_actual NUMERIC(18, 2) NOT NULL DEFAULT 0,
    monto_acumulado NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_item_val_const_tenant ON items_valuacion_construccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_item_val_const_val ON items_valuacion_construccion(valuacion_id);

-- 6. Insumos, Equipos y Cuadrillas de Obra
CREATE TABLE IF NOT EXISTS insumos_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- MATERIAL, EQUIPO, MANO_OBRA
    unidad VARCHAR(20) NOT NULL,
    costo_unitario NUMERIC(18, 2) NOT NULL DEFAULT 0,
    stock_actual NUMERIC(14, 2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(14, 2) NOT NULL DEFAULT 0,
    proveedor VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_insumo_const_tenant ON insumos_construccion(tenant_id);

-- 7. Bitácora y Libro Diario de Obra
CREATE TABLE IF NOT EXISTS bitacora_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    proyecto_id BIGINT NOT NULL REFERENCES proyectos_construccion(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    clima VARCHAR(50) NOT NULL DEFAULT 'SOLEADO',
    personal_activo INT NOT NULL DEFAULT 0,
    cuadrillas_activas VARCHAR(255),
    maquinaria_operativa TEXT,
    actividades_ejecutadas TEXT NOT NULL,
    observaciones_e_incidentes TEXT,
    elaborado_por VARCHAR(150),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bitacora_const_tenant ON bitacora_construccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_const_proy ON bitacora_construccion(proyecto_id);

-- 8. Catálogo Maestro de Partidas COVENIN / FONDONORMA (Referencial)
CREATE TABLE IF NOT EXISTS catalogo_partidas_covenin (
    id BIGSERIAL PRIMARY KEY,
    codigo_covenin VARCHAR(50) NOT NULL UNIQUE,
    capitulo_codigo VARCHAR(50) NOT NULL,
    capitulo_nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    precio_referencial NUMERIC(18, 2) NOT NULL DEFAULT 0,
    rendimiento_promedio NUMERIC(12, 2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cat_covenin_codigo ON catalogo_partidas_covenin(codigo_covenin);

-- Inserción referencial COVENIN básica
INSERT INTO catalogo_partidas_covenin (codigo_covenin, capitulo_codigo, capitulo_nombre, descripcion, unidad, precio_referencial, rendimiento_promedio)
VALUES
('E.111.100.000', 'CAP-01', 'Obras Preliminares', 'Deforestación y limpieza liviana mecanizada en terreno plano', 'm2', 0.85, 800.0),
('E.121.100.000', 'CAP-01', 'Obras Preliminares', 'Replanteo topográfico de edificaciones con teodolito y estación total', 'm2', 1.20, 450.0),
('E.211.110.000', 'CAP-02', 'Movimiento de Tierra', 'Excavación en zanjas a máquina para fundaciones en tierra dura, prof. hasta 1.50m', 'm3', 6.50, 65.0),
('E.211.200.000', 'CAP-02', 'Movimiento de Tierra', 'Excavación manual en zanjas y fosas para zapatas y fundaciones', 'm3', 14.20, 3.5),
('E.221.100.000', 'CAP-02', 'Movimiento de Tierra', 'Carga a máquina y bote de tierra sobrante con camión volquete (dist. hasta 10km)', 'm3', 8.50, 75.0),
('E.311.110.150', 'CAP-03', 'Estructuras de Concreto', 'Concreto premezclado de f''c=250 kg/cm2 a los 28 días para zapatas y losas de fundación', 'm3', 135.00, 25.0),
('E.311.110.200', 'CAP-03', 'Estructuras de Concreto', 'Concreto premezclado de f''c=280 kg/cm2 para vigas de carga y columnas estructurales', 'm3', 148.00, 20.0),
('E.313.110.000', 'CAP-03', 'Estructuras de Concreto', 'Suministro, corte, doblado y colocación de acero de refuerzo Cabilla fy=4200 kg/cm2', 'kg', 1.75, 220.0),
('E.312.110.000', 'CAP-03', 'Estructuras de Concreto', 'Encofrado de madera tipo recto para columnas y pedestales, incluye desmoldante', 'm2', 16.80, 18.0),
('E.411.110.150', 'CAP-04', 'Albañilería y Acabados', 'Construcción de pared de bloques de arcilla perforados e=15cm, con mortero 1:4', 'm2', 15.50, 16.0),
('E.412.110.000', 'CAP-04', 'Albañilería y Acabados', 'Friso acabado liso interior en paredes con pasta profesional y cal hidratada', 'm2', 8.50, 24.0),
('E.511.100.000', 'CAP-05', 'Instalaciones Sanitarias', 'Suministro e instalación de tubería de aguas negras PVC sanitario de diam. 4 pulg', 'ml', 12.80, 28.0),
('E.611.100.000', 'CAP-06', 'Instalaciones Eléctricas', 'Punto de tomacorriente doble 110V polarizado empotrado en tubería EMT de 1/2 pulg', 'pto', 22.00, 14.0)
ON CONFLICT (codigo_covenin) DO NOTHING;


-- 9. Control de Idempotencia para Operaciones Críticas (Valuaciones, Bitácora, Consumo de Insumos)
CREATE TABLE IF NOT EXISTS idempotencia_construccion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    recurso_tipo VARCHAR(50) NOT NULL, -- VALUACION, BITACORA, CONSUMO_INSUMO
    recurso_id BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_idemp_tenant_key UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_idemp_tenant_key ON idempotencia_construccion(tenant_id, idempotency_key);
