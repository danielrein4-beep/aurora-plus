-- Asegura que cualquier tenant registrado con modulo_principal 'odontologia'
-- tenga activo el modulo backend 'salud' en modulos_tenant para permitir el acceso a /api/salud/**
INSERT INTO modulos_tenant (is_active, fecha_activacion, modulo_nombre, tenant_id)
SELECT true, CURRENT_DATE, 'salud', t.tenant_id
FROM licencias_tenant t
WHERE t.modulo_principal = 'odontologia'
  AND NOT EXISTS (
      SELECT 1 FROM modulos_tenant m 
      WHERE m.tenant_id = t.tenant_id AND m.modulo_nombre = 'salud'
  );
