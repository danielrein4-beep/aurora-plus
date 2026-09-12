-- El frontend enviaba codigo, color, observaciones y el polígono trazado en el mapa
-- desde siempre, pero la entidad Potrero nunca tuvo esas columnas: Jackson las
-- deserializaba en el request y Hibernate las descartaba en silencio al guardar.
-- Efecto real reportado por el usuario: al trazar un potrero en el mapa, el color
-- elegido se perdía y el potrero reaparecía en otra posición/forma al recargar
-- (el mapa cae a un rectángulo inventado cuando no hay polígono real guardado).
ALTER TABLE potreros ADD COLUMN codigo VARCHAR(50);
ALTER TABLE potreros ADD COLUMN color VARCHAR(20);
ALTER TABLE potreros ADD COLUMN observaciones TEXT;
ALTER TABLE potreros ADD COLUMN poligono_json TEXT;
