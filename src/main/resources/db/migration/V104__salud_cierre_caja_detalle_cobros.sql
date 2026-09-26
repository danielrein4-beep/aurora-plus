-- El cierre de caja de Mediclinic ya se guardaba en el servidor, pero solo con los totales: el
-- detalle de cobros (para reimprimir el cierre desde otra computadora) vivía en el navegador.
-- (V103 no creó nada nuevo: la tabla ya existía; solo agregó un índice por negocio y fecha.)
ALTER TABLE salud_cierres_caja ADD COLUMN IF NOT EXISTS cobros_json TEXT;
