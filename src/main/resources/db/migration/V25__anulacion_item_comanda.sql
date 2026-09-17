-- Anulación de un ítem individual dentro de una comanda ABIERTA (no de la
-- comanda completa) — antes solo existía anular la comanda entera, lo que
-- dejaba una puerta abierta: un mesero podía cobrar en efectivo y luego
-- "arreglar" el sistema quitando un plato sin dejar rastro de quién ni por
-- qué. Ahora cada anulación de ítem exige motivo y queda con usuario/fecha.
ALTER TABLE items_comanda ADD COLUMN motivo_anulacion VARCHAR(255);
ALTER TABLE items_comanda ADD COLUMN usuario_anulacion VARCHAR(255);
ALTER TABLE items_comanda ADD COLUMN fecha_anulacion TIMESTAMP;
