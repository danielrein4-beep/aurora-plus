-- Control real del catálogo público: antes el catálogo no tenía categoría editable
-- (se inventaba una a partir de si el ítem tenía código OEM), no había forma de ocultar
-- un producto sin borrarlo, y el orden de aparición era el de inserción en la base de
-- datos. Con Comercio cubriendo rubros tan distintos (celulares, perfumes, zapatos,
-- ferretería) en el mismo catálogo, el dueño necesita organizarlo de verdad.
ALTER TABLE repuestos_items
    ADD COLUMN categoria VARCHAR(60),
    ADD COLUMN visible BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN orden_visualizacion INTEGER NOT NULL DEFAULT 0;
