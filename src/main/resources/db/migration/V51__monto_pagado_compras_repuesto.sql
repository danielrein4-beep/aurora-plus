-- RepuestoCompraService cargaba SIEMPRE el total entero de la factura a Cuentas por
-- Pagar (CXP), aunque el negocio le hubiera pagado al proveedor de contado —
-- igual que le pasaba a Horeca antes de que CompraInsumoHorecaService ganara el
-- soporte de pago parcial/de contado. Se agrega monto_pagado (mismo patrón que
-- compras_insumo_horeca) para poder registrar el pago real como EGRESO y dejar
-- como CXP solo el saldo pendiente, si lo hay.
ALTER TABLE compras_repuesto ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(18,2);
