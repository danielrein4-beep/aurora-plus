-- El arete de animales nació (fuera de Flyway, por Hibernate) como UNIQUE global:
-- dos fincas distintas no podían tener un animal "001", y la segunda finca en
-- migrar su hato chocaba contra datos ajenos que ni siquiera puede ver. El arete
-- es único DENTRO de cada finca (tenant), igual que lo valida el backend.
-- El nombre de la restricción la generó Hibernate (uk_...), así que se busca
-- cualquier UNIQUE cuya única columna sea arete y se elimina.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'animales'
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND c.conkey[1] = (
              SELECT a.attnum FROM pg_attribute a
              WHERE a.attrelid = t.oid AND a.attname = 'arete'
          )
    LOOP
        EXECUTE format('ALTER TABLE animales DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_animales_tenant_arete ON animales (tenant_id, arete);
