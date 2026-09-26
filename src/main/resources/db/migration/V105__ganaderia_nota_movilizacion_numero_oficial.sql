-- V105: Ganadería - nota de movilización.
-- El número de la guía oficial del INSAI se guarda aparte (opcional: puede emitirse después),
-- y el número interno de la nota pasa a ser único por finca: antes era único en todo el
-- sistema y obligatorio, así que no se podía crear la nota sin la guía oficial y dos fincas
-- chocaban si repetían número.

ALTER TABLE guias_traslado ADD COLUMN IF NOT EXISTS numero_guia_oficial VARCHAR(60);

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'guias_traslado'
          AND con.contype = 'u'
          AND array_length(con.conkey, 1) = 1
          AND (SELECT attname FROM pg_attribute WHERE attrelid = rel.oid AND attnum = con.conkey[1]) = 'numero_guia'
    LOOP
        EXECUTE format('ALTER TABLE guias_traslado DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_guias_traslado_tenant_numero ON guias_traslado (tenant_id, numero_guia);
