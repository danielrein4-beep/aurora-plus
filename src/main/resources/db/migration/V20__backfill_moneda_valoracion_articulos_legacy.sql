-- V19 agregó moneda_valoracion sin backfill porque en general la moneda histórica de
-- cada fila no se puede reconstruir con certeza. Pero para las filas que YA EXISTÍAN antes
-- de V19 (moneda_valoracion IS NULL) el invariante del resto del sistema ya se cumplía:
-- costo_unitario siempre se guardó normalizado a la moneda base del tenant en el momento
-- de escribirse (ver MotorFinancieroService.convertirAMonedaBase/convertirCostoAMonedaBase,
-- usado por ArticuloController y CompraInsumoHorecaService desde antes de este checkpoint).
-- Por eso es seguro completarlas con la moneda base ACTUAL del tenant — no es una suposición,
-- es la moneda en la que ese costo ya estaba expresado cuando se guardó.
UPDATE articulos a
SET moneda_valoracion = lt.moneda_base
FROM licencias_tenant lt
WHERE a.tenant_id = lt.tenant_id
  AND a.moneda_valoracion IS NULL
  AND a.costo_unitario IS NOT NULL;
