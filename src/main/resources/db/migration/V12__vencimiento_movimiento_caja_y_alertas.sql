-- Alerta de vencimiento de CXC/CXP (fiado a clientes, crédito de proveedores). Nullable a
-- propósito: una cuenta ya existente sin fecha pactada simplemente no genera alerta.
ALTER TABLE movimientos_caja ADD COLUMN fecha_vencimiento DATE;

-- Nuevos tipos de AlertaAdmin (antes solo existía DESCUADRE_CAJA) + referencia opcional a qué
-- movimiento disparó la alerta, para que la UI pueda enlazar directo a esa cuenta.
ALTER TABLE alertas_admin ADD COLUMN referencia_id BIGINT;
