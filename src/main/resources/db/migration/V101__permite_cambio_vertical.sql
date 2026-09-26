-- Cuentas de verificacion: las creadas desde el superadmin pueden cambiar de vertical desde el Hub
-- (y usar todas las verticales) para revisar rapido. Se puede apagar por negocio desde el superadmin.
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS permite_cambio_vertical BOOLEAN NOT NULL DEFAULT false;
