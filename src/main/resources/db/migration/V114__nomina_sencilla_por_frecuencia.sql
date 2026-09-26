-- Nómina cómoda para cada rubro: cada trabajador cobra semanal, quincenal o mensual; el período
-- se paga por frecuencia; el pago sale de caja y queda el recibo con lo trabajado.
ALTER TABLE asignaciones_empleado ADD COLUMN IF NOT EXISTS frecuencia_pago VARCHAR(12) NOT NULL DEFAULT 'QUINCENAL';

ALTER TABLE periodos_nomina ADD COLUMN IF NOT EXISTS frecuencia VARCHAR(12);

-- Lo que el dueño revisó antes de pagar (días, horas, bono, descuento) y el egreso en caja.
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS dias_trabajados NUMERIC(8,2);
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS horas_marcadas NUMERIC(10,2);
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS bono NUMERIC(18,2);
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS descuento NUMERIC(18,2);
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS nota VARCHAR(255);
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS movimiento_caja_id BIGINT;
ALTER TABLE nominas_empleado ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP;
