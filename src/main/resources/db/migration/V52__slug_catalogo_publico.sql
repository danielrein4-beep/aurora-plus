-- V51: Slug para catalogo publico y proteccion contra enumeracion secuencial (IDOR)
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS slug_catalogo VARCHAR(100);

-- Generar slugs iniciales para todos los tenants a partir del nombre comercial
UPDATE licencias_tenant
SET slug_catalogo = LOWER(REGEXP_REPLACE(TRIM(nombre_empresa), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug_catalogo IS NULL AND nombre_empresa IS NOT NULL;

-- Limpiar guiones iniciales o finales
UPDATE licencias_tenant
SET slug_catalogo = TRIM(BOTH '-' FROM slug_catalogo)
WHERE slug_catalogo IS NOT NULL;

-- Para los que queden vacios o nulos, asignar fallback basado en tenant_id
UPDATE licencias_tenant
SET slug_catalogo = 'tienda-' || tenant_id
WHERE slug_catalogo IS NULL OR slug_catalogo = '';

-- Resolver colisiones duplicadas agregando el tenant_id
UPDATE licencias_tenant lt
SET slug_catalogo = lt.slug_catalogo || '-' || lt.tenant_id
WHERE lt.id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY slug_catalogo ORDER BY tenant_id) as rn
        FROM licencias_tenant
    ) t WHERE t.rn > 1
);

-- Indice unico para busqueda rapida y unicidad estricta
CREATE UNIQUE INDEX IF NOT EXISTS idx_licencias_tenant_slug_catalogo ON licencias_tenant(slug_catalogo);
