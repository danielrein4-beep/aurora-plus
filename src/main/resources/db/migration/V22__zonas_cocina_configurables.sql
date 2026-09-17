-- Estaciones de cocina de Horeca personalizables por negocio (ej. "COCINA,PARRILLA,BAR")
-- en vez de las 4 fijas que traía el frontend. NULL = sigue usando las 4 por defecto.
ALTER TABLE licencias_tenant ADD COLUMN zonas_cocina TEXT;
