-- Zapatos/camisas/etc. se llevan en inventario como SKU independientes por talla o
-- color (cada uno con su propio stock — eso NO cambia), pero mostrarlos en el catálogo
-- público como tarjetas separadas es confuso para el cliente. `grupo_variante` junta
-- todos los SKU del mismo producto base (ej. "zapato-nike-air-max") en una sola tarjeta
-- con selector; `atributo_variante` es la etiqueta de ESE SKU dentro del grupo
-- (ej. "Talla 38", "Rojo"). Ambos null = producto sin variantes, se muestra igual que
-- hoy, sin agrupar con nada.
ALTER TABLE repuestos_items
    ADD COLUMN grupo_variante VARCHAR(80),
    ADD COLUMN atributo_variante VARCHAR(40);

CREATE INDEX idx_repuesto_tenant_grupo_variante ON repuestos_items (tenant_id, grupo_variante);
