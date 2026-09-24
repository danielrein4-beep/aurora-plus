-- Configuración de la plataforma (no de un negocio): por ahora, las cuentas donde los clientes
-- pagan su suscripción. Antes se guardaban solo en el navegador del super admin, así que editarlas
-- no le llegaba a ningún cliente.
CREATE TABLE IF NOT EXISTS saas_config (
    clave VARCHAR(80) PRIMARY KEY,
    valor TEXT,
    actualizado_en TIMESTAMP,
    actualizado_por VARCHAR(80)
);
