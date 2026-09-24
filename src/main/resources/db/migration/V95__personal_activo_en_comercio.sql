-- Gestion de Personal (directorio, turnos, asistencia y metas/comisiones) viene incluida en
-- las verticales de Comercio. Antes ningun tenant tenia estos modulos y la tarjeta del Hub
-- devolvia al usuario al inicio sin explicacion. Nomina avanzada queda fuera (depende del plan).
INSERT INTO modulos_tenant (is_active, fecha_activacion, modulo_nombre, tenant_id)
SELECT true, CURRENT_DATE, m.nombre, t.tenant_id
FROM licencias_tenant t
CROSS JOIN (VALUES ('personal'), ('asistencia'), ('metas')) AS m(nombre)
WHERE t.modulo_principal IN ('repuestos', 'ferreteria', 'moda', 'tamanaco-comercial', 'farmacia')
  AND NOT EXISTS (
      SELECT 1 FROM modulos_tenant x
      WHERE x.tenant_id = t.tenant_id AND x.modulo_nombre = m.nombre
  );
