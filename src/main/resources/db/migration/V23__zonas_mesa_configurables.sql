-- Zonas físicas de mesas de Horeca personalizables por negocio (ej. "SALON_PRINCIPAL,TERRAZA,BARRA")
-- en vez de las 3 fijas que traía el frontend. NULL = sigue usando las 3 por defecto.
ALTER TABLE licencias_tenant ADD COLUMN zonas_mesa TEXT;
