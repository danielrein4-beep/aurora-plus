-- Permite guardar la fecha de vencimiento del crédito otorgado por el
-- proveedor (ej. "5 días de crédito" en la factura) en una cuenta por pagar
-- (CXP) o por cobrar (CXC). Nulo en movimientos que no aplican (INGRESO,
-- EGRESO) o en CXP/CXC antiguas registradas antes de esta migración.
ALTER TABLE movimientos_caja ADD COLUMN fecha_vencimiento DATE;
