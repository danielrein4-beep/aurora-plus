-- Mercado Ganadero: el vendedor confirma que recibió el pago antes de que el comprador reciba el
-- animal, y un trato aceptado se puede anular (con motivo) mientras no se haya traspasado.
-- Antes un trato que se caía dejaba el animal "vendido", la deuda abierta y las comisiones
-- cobrables, sin forma de deshacerlo desde la aplicación.
ALTER TABLE ofertas_compra ADD COLUMN IF NOT EXISTS pago_confirmado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ofertas_compra ADD COLUMN IF NOT EXISTS fecha_pago_confirmado TIMESTAMP;
ALTER TABLE ofertas_compra ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(300);
ALTER TABLE ofertas_compra ADD COLUMN IF NOT EXISTS anulada_por_tenant_id BIGINT;
ALTER TABLE ofertas_compra ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP;
