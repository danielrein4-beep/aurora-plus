-- Capa 1 del motor financiero (docs/finance-contract.md): trazabilidad de origen para
-- movimientos_caja. Todas nullable / sin default forzado: aditivo, no rompe filas existentes.
ALTER TABLE movimientos_caja ADD COLUMN modulo_origen VARCHAR(30);
ALTER TABLE movimientos_caja ADD COLUMN referencia_tipo VARCHAR(60);
ALTER TABLE movimientos_caja ADD COLUMN referencia_id BIGINT;

-- Congela el costo unitario en ventas NUEVAS de Moda, igual criterio que
-- items_venta_retail e items_comanda. Nullable y sin backfill a propósito: las ventas
-- históricas no tienen forma de saber su costo real del momento, y forzar el costo
-- actual del producto falsificaría su margen histórico.
ALTER TABLE detalles_venta_moda ADD COLUMN costo_unitario NUMERIC(18,4);
