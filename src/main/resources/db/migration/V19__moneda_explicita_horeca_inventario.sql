-- Sin backfill: la moneda histórica no se puede deducir de la configuración actual.
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS moneda_valoracion VARCHAR(3);
ALTER TABLE comandas ADD COLUMN IF NOT EXISTS moneda_total VARCHAR(3);
