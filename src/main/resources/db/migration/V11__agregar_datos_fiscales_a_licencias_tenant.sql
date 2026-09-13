-- Datos fiscales opcionales del negocio (RIF, razón social, domicilio fiscal) para
-- estampar en notas de entrega y recibos de venta/despacho — nunca obligatorios.
ALTER TABLE licencias_tenant ADD COLUMN rif VARCHAR(255);
ALTER TABLE licencias_tenant ADD COLUMN razon_social VARCHAR(255);
ALTER TABLE licencias_tenant ADD COLUMN domicilio_fiscal TEXT;
