-- ItemComanda.notas (com.auroraplus.modules.horeca.entities.ItemComanda) ya existía en el
-- código pero nunca tuvo migración — el esquema local se quedó desincronizado y Hibernate
-- fallaba en el arranque con "missing column [notas] in table [items_comanda]".
ALTER TABLE items_comanda ADD COLUMN IF NOT EXISTS notas VARCHAR(255);
