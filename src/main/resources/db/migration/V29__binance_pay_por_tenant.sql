-- Binance Pay configurable por negocio (no de Aurora Plus) — cada tenant
-- pone su propia cuenta Binance Merchant para cobrar sus propias ventas.
-- El secret key nunca se guarda en texto plano (ver CifradoSimetricoService).
ALTER TABLE licencias_tenant ADD COLUMN binance_pay_api_key VARCHAR(255);
ALTER TABLE licencias_tenant ADD COLUMN binance_pay_secret_key_cifrado TEXT;
ALTER TABLE licencias_tenant ADD COLUMN binance_pay_activo BOOLEAN NOT NULL DEFAULT FALSE;
