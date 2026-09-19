-- La entidad ConsultaMedica (Mediclinic) declara recipe_medicamentos para guardar el
-- listado de farmacos prescritos (VademecumPrescriptor), pero solo se habia migrado esta
-- columna para la tabla de Veterinaria (V43) — salud_consultas nunca la tuvo, lo que
-- rompia cualquier SELECT/INSERT sobre consultas medicas en Mediclinic.
ALTER TABLE salud_consultas ADD COLUMN IF NOT EXISTS recipe_medicamentos TEXT;
