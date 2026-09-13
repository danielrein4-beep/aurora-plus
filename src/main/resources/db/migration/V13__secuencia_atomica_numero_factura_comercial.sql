-- Antes, el numero_control se calculaba en Java (MAX+1 sobre la última factura leída) — dos
-- facturas creadas casi al mismo tiempo podían leer el mismo "último número" y chocar contra el
-- UNIQUE de numero_control, abortando la transacción de la segunda. Una secuencia de Postgres es
-- atómica por diseño (nextval() nunca repite un valor, sin necesidad de bloqueos): dos peticiones
-- concurrentes siempre obtienen números distintos.
CREATE SEQUENCE IF NOT EXISTS seq_factura_comercial;

-- Arranca la secuencia después del último número YA emitido, para no chocar con facturas
-- existentes (si la tabla está vacía, COALESCE deja que arranque en 1 como de costumbre).
SELECT setval('seq_factura_comercial', COALESCE((
    SELECT MAX(CAST(SPLIT_PART(numero_control, '-', 2) AS INTEGER))
    FROM facturas_comercial
    WHERE numero_control ~ '^[0-9]+-[0-9]+$'
), 0) + 1, false);
