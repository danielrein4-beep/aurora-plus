-- Segundo factor (TOTP, compatible con Google Authenticator / Authy / Microsoft
-- Authenticator) para las cuentas de administración de la plataforma.
-- totp_secreto se guarda cifrado (CifradoSimetricoService). Mientras totp_activo
-- sea false el secreto es solo una propuesta pendiente de confirmar.
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS totp_secreto TEXT;
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS totp_activo BOOLEAN NOT NULL DEFAULT FALSE;
