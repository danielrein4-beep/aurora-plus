-- La columna estado_item de items_comanda tiene un CHECK constraint (creado
-- fuera de Flyway, en el origen de la base) que solo permitía
-- PENDIENTE/PREPARANDO/LISTO/ENTREGADO. Al agregar el estado ANULADO
-- (anulación de un ítem individual, ver V25) cualquier intento de guardarlo
-- reventaba con "viola la restricción check items_comanda_estado_item_check".
ALTER TABLE items_comanda DROP CONSTRAINT IF EXISTS items_comanda_estado_item_check;
ALTER TABLE items_comanda ADD CONSTRAINT items_comanda_estado_item_check
    CHECK (estado_item IN ('PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO', 'ANULADO'));
