-- Qué serie de tasa USD/VES gobierna el cobro en el POS: BCV, USDT o PERSONALIZADA.
-- Decisión de negocio (Dueño/Administrador) — antes vivía como preferencia de UI en
-- localStorage del navegador, lo que se desincronizaba entre terminales/dispositivos.
ALTER TABLE licencias_tenant ADD COLUMN origen_tasa_activa VARCHAR(20) NOT NULL DEFAULT 'USDT';
