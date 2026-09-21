-- Vincula cada despacho de leche con el ingreso de caja que lo respalda.
-- Es aditivo y seguro para fincas ya existentes.
ALTER TABLE ventas_leche_tanque
    ADD COLUMN IF NOT EXISTS movimiento_caja_id BIGINT;

ALTER TABLE ventas_animal
    ADD COLUMN IF NOT EXISTS movimiento_caja_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_ventas_leche_tanque_movimiento_caja
    ON ventas_leche_tanque(movimiento_caja_id);

CREATE INDEX IF NOT EXISTS idx_ventas_animal_movimiento_caja
    ON ventas_animal(movimiento_caja_id);
