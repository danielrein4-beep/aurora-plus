-- Cierra 3 huecos de aislamiento multi-tenant encontrados en auditoría de seguridad:
--
-- 1) items_venta_retail no tenía tenant_id: GET /api/retail/ventas/{id}/items
--    devolvía los items de CUALQUIER venta de CUALQUIER tenant a cualquier
--    usuario autenticado (sin exigir tenantId, sin filtro de Hibernate). Ver
--    ItemVentaRetail.java y RetailVentaController.itemsDeVenta.
-- 2) salud_resultados_laboratorio / salud_adjuntos_resultado_lab no tenían
--    tenant_id: hoy solo se leen a través de OrdenLaboratorio (ya filtrada),
--    pero sin su propio filtro un endpoint nuevo quedaría desprotegido desde
--    el primer día. Defensa en profundidad.
--
-- Backfill: cada tabla hija toma el tenant_id de su padre ya filtrado
-- (ventas_retail / salud_ordenes_laboratorio), así que es seguro para datos
-- existentes antes de exigir NOT NULL.

ALTER TABLE items_venta_retail ADD COLUMN tenant_id BIGINT;
UPDATE items_venta_retail i
    SET tenant_id = v.tenant_id
    FROM ventas_retail v
    WHERE v.id = i.venta_id;
ALTER TABLE items_venta_retail ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_items_venta_retail_tenant ON items_venta_retail(tenant_id);

ALTER TABLE salud_resultados_laboratorio ADD COLUMN tenant_id BIGINT;
UPDATE salud_resultados_laboratorio r
    SET tenant_id = o.tenant_id
    FROM salud_ordenes_laboratorio o
    WHERE o.id = r.orden_id;
ALTER TABLE salud_resultados_laboratorio ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_salud_resultados_lab_tenant ON salud_resultados_laboratorio(tenant_id);

ALTER TABLE salud_adjuntos_resultado_lab ADD COLUMN tenant_id BIGINT;
UPDATE salud_adjuntos_resultado_lab a
    SET tenant_id = r.tenant_id
    FROM salud_resultados_laboratorio r
    WHERE r.id = a.resultado_id;
ALTER TABLE salud_adjuntos_resultado_lab ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_salud_adjuntos_lab_tenant ON salud_adjuntos_resultado_lab(tenant_id);

-- 3) licencias_tenant.tenant_id no tenía constraint UNIQUE: se asignaba con
--    SELECT MAX(tenant_id)+1 dentro de una transacción normal (READ COMMITTED
--    en Postgres), así que dos registros de negocio ("POST
--    /api/auth/registro-negocio") simultáneos podían leer el mismo MAX antes
--    de que ninguno confirmara, y ambos terminaban con el MISMO tenant_id —
--    dos negocios distintos mezclando datos en el mismo tenant. El código ya
--    se corrigió con un advisory lock (ver TenantProvisioningService); este
--    UNIQUE es el candado de base de datos que garantiza que, aunque el
--    código vuelva a tener este bug algún día, la base rechace la segunda
--    fila en vez de aceptarla en silencio.
ALTER TABLE licencias_tenant ADD CONSTRAINT uk_licencias_tenant_tenant_id UNIQUE (tenant_id);
