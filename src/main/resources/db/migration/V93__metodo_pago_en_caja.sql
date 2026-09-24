-- Método con que entró o salió el dinero (EFECTIVO, PAGO_MOVIL, TARJETA, ZELLE...).
-- El arqueo de caja solo cuenta el efectivo: antes sumaba también los pagos
-- electrónicos y marcaba descuadres falsos. Los movimientos anteriores quedan
-- sin método y se siguen contando como antes.
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30);
