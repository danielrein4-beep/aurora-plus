-- WhatsApp Business Cloud API (Meta) configurable por negocio — cada tenant
-- pone su propia cuenta y plantilla aprobada para automatizar el recordatorio
-- de citas por WhatsApp (antes solo un link wa.me manual). El access token
-- nunca se guarda en texto plano (ver CifradoSimetricoService).
ALTER TABLE licencias_tenant ADD COLUMN whatsapp_phone_number_id VARCHAR(255);
ALTER TABLE licencias_tenant ADD COLUMN whatsapp_access_token_cifrado TEXT;
ALTER TABLE licencias_tenant ADD COLUMN whatsapp_plantilla_nombre VARCHAR(255);
ALTER TABLE licencias_tenant ADD COLUMN whatsapp_activo BOOLEAN NOT NULL DEFAULT FALSE;
