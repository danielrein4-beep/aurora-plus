-- Estetica: comisiones por profesional y venta de productos (el stock vive en articulos/kardex del nucleo).

CREATE TABLE IF NOT EXISTS salud_estetica_profesionales (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    comision_servicios NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (comision_servicios BETWEEN 0 AND 100),
    comision_productos NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (comision_productos BETWEEN 0 AND 100),
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estetica_profesionales_tenant ON salud_estetica_profesionales (tenant_id, activo);

-- Quien hizo la sesion y cuanto vale, para calcular su comision. En sesiones de paquete el
-- valor es el precio del paquete entre sus sesiones.
ALTER TABLE salud_estetica_sesiones ADD COLUMN IF NOT EXISTS profesional_id BIGINT REFERENCES salud_estetica_profesionales(id);
ALTER TABLE salud_estetica_sesiones ADD COLUMN IF NOT EXISTS valor NUMERIC(14, 2);
ALTER TABLE salud_estetica_sesiones ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'USD';
CREATE INDEX IF NOT EXISTS idx_estetica_sesiones_profesional ON salud_estetica_sesiones (tenant_id, profesional_id, fecha_sesion);

CREATE TABLE IF NOT EXISTS salud_estetica_ventas_productos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT REFERENCES salud_pacientes(id),
    profesional_id BIGINT REFERENCES salud_estetica_profesionales(id),
    cobro_id BIGINT NOT NULL,
    clave_idempotencia VARCHAR(100) NOT NULL,
    total NUMERIC(14, 2) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'USD',
    detalle TEXT NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_estetica_venta_clave UNIQUE (tenant_id, clave_idempotencia)
);
CREATE INDEX IF NOT EXISTS idx_estetica_ventas_fecha ON salud_estetica_ventas_productos (tenant_id, fecha);
