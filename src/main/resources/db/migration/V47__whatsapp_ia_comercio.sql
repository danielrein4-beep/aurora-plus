-- Configuracion del Asistente IA de WhatsApp y registro de conversaciones
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS whatsapp_ia_activa BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS whatsapp_ia_saludo VARCHAR(255);
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS whatsapp_ia_zonas_delivery TEXT;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS whatsapp_ia_politica_delivery TEXT;
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS whatsapp_webhook_verify_token VARCHAR(100);

-- Actualizar token por defecto para tenant 2
UPDATE licencias_tenant 
SET whatsapp_webhook_verify_token = 'aurora_token_tornillo_2026',
    whatsapp_ia_saludo = 'Hola, bienvenido a Ferreteria El Tornillo Feliz. Estoy aqui para ayudarte con precios, stock y pedidos.'
WHERE tenant_id = 2 AND whatsapp_webhook_verify_token IS NULL;

CREATE TABLE IF NOT EXISTS comercio_whatsapp_conversaciones (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    telefono_cliente VARCHAR(50) NOT NULL,
    mensaje_cliente TEXT NOT NULL,
    respuesta_ia TEXT NOT NULL,
    intencion VARCHAR(50),
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enviado_a_meta BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant ON comercio_whatsapp_conversaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_telf ON comercio_whatsapp_conversaciones(telefono_cliente);
