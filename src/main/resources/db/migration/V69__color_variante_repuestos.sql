-- Segunda faceta de variante, además de `atributo_variante` (talla/modelo) — permite
-- un selector de dos pasos en el catálogo público (primero color, después talla), como
-- cualquier tienda de ropa/calzado real. Null = el producto no varía por color.
ALTER TABLE repuestos_items
    ADD COLUMN color_variante VARCHAR(40);
