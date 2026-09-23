-- El dueño necesita poder contarle al cliente qué es cada producto (material, talla,
-- garantía) y mostrar una foto real en el catálogo público — antes no existía ningún
-- campo para eso; `descripcion` ya funcionaba como el nombre corto del artículo.
ALTER TABLE repuestos_items
    ADD COLUMN descripcion_larga TEXT,
    ADD COLUMN imagen_base64 TEXT;
