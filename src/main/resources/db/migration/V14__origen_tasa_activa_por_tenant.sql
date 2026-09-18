-- Reemplaza metodo_tasa_automatica (V13, mecanismo propio descartado) por origen_tasa_activa:
-- misma metodología que ya usa Aurora Horeca para decidir qué serie de tasa USD/VES gobierna
-- el cobro en el POS (BCV, USDT o PERSONALIZADA). Se adopta este nombre y semántica para que
-- Comercio, Mediclinic y el resto de verticales queden alineadas con el mismo mecanismo.
ALTER TABLE licencias_tenant DROP COLUMN metodo_tasa_automatica;
ALTER TABLE licencias_tenant ADD COLUMN origen_tasa_activa VARCHAR(20) NOT NULL DEFAULT 'USDT';
