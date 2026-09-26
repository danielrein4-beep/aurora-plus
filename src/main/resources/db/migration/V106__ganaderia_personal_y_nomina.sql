-- Ganadería incluye Personal y nómina de los obreros de la finca: directorio, asistencia
-- (jornadas) y nómina con conceptos propios. Se activa para las fincas que ya existen;
-- las nuevas lo reciben al darse de alta (TenantProvisioningService).
INSERT INTO modulos_tenant (tenant_id, modulo_nombre, is_active, fecha_activacion)
SELECT g.tenant_id, f.flag, TRUE, NOW()
FROM modulos_tenant g
CROSS JOIN (VALUES ('personal'), ('asistencia'), ('nomina-avanzada')) AS f(flag)
WHERE g.modulo_nombre = 'ganaderia'
  AND g.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM modulos_tenant m
      WHERE m.tenant_id = g.tenant_id AND m.modulo_nombre = f.flag
  );

-- Cargos habituales del campo, para no empezar con la lista vacía. Solo se agregan los que
-- la finca no tenga ya con ese nombre.
INSERT INTO cargos_personal (tenant_id, nombre, descripcion)
SELECT g.tenant_id, c.nombre, c.descripcion
FROM modulos_tenant g
CROSS JOIN (VALUES
    ('Encargado', 'Dirige el trabajo diario de la finca y responde por el hato'),
    ('Vaquero / Caporal', 'Manejo del ganado: arreo, rotación de potreros, mangas'),
    ('Ordeñador', 'Ordeño y cuidado del equipo y el tanque de leche'),
    ('Becerrero', 'Cría y alimentación de becerros'),
    ('Tractorista', 'Maquinaria, siembra de pasto y ensilaje'),
    ('Obrero de campo', 'Cercas, limpieza de potreros y labores generales')
) AS c(nombre, descripcion)
WHERE g.modulo_nombre = 'ganaderia'
  AND g.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM cargos_personal cp
      WHERE cp.tenant_id = g.tenant_id AND LOWER(cp.nombre) = LOWER(c.nombre)
  );
