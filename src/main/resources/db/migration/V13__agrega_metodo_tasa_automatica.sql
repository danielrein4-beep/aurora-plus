-- Fuente automática de la tasa de cambio USD->VES de cada tenant: antes la
-- tasa "USDT"/"BCV" solo se podía teclear a mano desde cada vertical (el
-- popover de tasas), sin ninguna conexión real a Binance P2P ni al Banco
-- Central de Venezuela. Este campo decide qué hace el job automático
-- (ActualizacionTasasAutomaticasJob) por cada tenant: seguir Binance P2P,
-- seguir el BCV oficial, o no tocar nada porque el negocio fija su propia
-- tasa a mano ("Propia").
ALTER TABLE licencias_tenant
    ADD COLUMN metodo_tasa_automatica VARCHAR(20) NOT NULL DEFAULT 'BINANCE';
