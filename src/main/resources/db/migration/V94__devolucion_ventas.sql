-- Devoluciones de ventas de Comercio: cada devolución deja su propio movimiento de kárdex
-- (tipo DEVOLUCION) apuntando a la venta original, para no devolver más de lo vendido.
ALTER TABLE movimientos_repuesto ADD COLUMN IF NOT EXISTS movimiento_origen_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_movimientos_repuesto_origen ON movimientos_repuesto (movimiento_origen_id);

-- La restricción de tipo (si existe) solo admitía COMPRA/VENTA/AJUSTE.
ALTER TABLE movimientos_repuesto DROP CONSTRAINT IF EXISTS movimientos_repuesto_tipo_check;
ALTER TABLE movimientos_repuesto ADD CONSTRAINT movimientos_repuesto_tipo_check
    CHECK (tipo IN ('COMPRA', 'VENTA', 'AJUSTE', 'DEVOLUCION'));
