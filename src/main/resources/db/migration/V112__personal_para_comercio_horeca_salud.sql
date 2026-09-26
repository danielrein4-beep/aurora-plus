-- Personal y asistencia para Comercio, Restaurante y Salud. Un negocio registrado como "comercio"
-- no recibía Personal (la regla solo contemplaba repuestos/ferretería/moda/farmacia), y
-- Restaurante y Salud nunca lo tuvieron: sin esto, el trabajador no podía marcar su entrada y su
-- salida. Se activa para los negocios que ya existen; los nuevos lo reciben al darse de alta
-- (TenantProvisioningService).
INSERT INTO modulos_tenant (tenant_id, modulo_nombre, is_active, fecha_activacion)
SELECT DISTINCT g.tenant_id, f.flag, TRUE, NOW()
FROM modulos_tenant g
CROSS JOIN (VALUES ('personal'), ('asistencia')) AS f(flag)
WHERE g.modulo_nombre IN ('comercio', 'horeca', 'salud')
  AND g.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM modulos_tenant m
      WHERE m.tenant_id = g.tenant_id AND m.modulo_nombre = f.flag
  );
