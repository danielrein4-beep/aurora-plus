-- Un gasto de la finca (sal mineral, alimento, desparasitante...) puede ser de un lote: el
-- margen se lo carga solo a los animales de ese lote. Vacío = gasto de todo el hato.
ALTER TABLE gastos_ganaderia ADD COLUMN lote VARCHAR(120);
