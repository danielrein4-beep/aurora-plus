-- Limpia metodo_tasa_automatica (V13, mecanismo propio descartado a favor de la metodología
-- que ya usaba Aurora Horeca). origen_tasa_activa la agrega V18__origen_tasa_activa_por_tenant.sql
-- (la de Horeca) — se dejó de duplicar aquí para no chocar con esa migración al fusionar ramas.
ALTER TABLE licencias_tenant DROP COLUMN metodo_tasa_automatica;
