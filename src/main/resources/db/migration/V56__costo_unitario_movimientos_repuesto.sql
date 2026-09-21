-- Congela el costo unitario en ventas NUEVAS del kardex de Repuestos, mismo criterio
-- que V15 aplicó a detalles_venta_moda (items_venta_retail / items_comanda). Nullable
-- y sin backfill a propósito: las ventas históricas no tienen forma de saber su costo
-- real del momento, y forzar el costo actual del catálogo falsificaría su margen
-- histórico — RepuestosCosteoProvider ya excluye del cálculo cualquier fila con
-- costo_unitario null (ver su campo "cobertura").
ALTER TABLE movimientos_repuesto ADD COLUMN costo_unitario NUMERIC(18,4);
