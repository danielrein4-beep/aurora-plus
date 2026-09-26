-- Ajustes de cada negocio que antes vivían solo en el navegador (configuración del local en
-- Restaurante, precio de la leche y tasas en Ganadería, fechas bloqueadas de la agenda médica).
-- En otro equipo arrancaban vacíos y se perdían al limpiar el navegador.
CREATE TABLE IF NOT EXISTS preferencias_tenant (
    tenant_id           BIGINT       NOT NULL,
    clave               VARCHAR(80)  NOT NULL,
    valor               TEXT         NOT NULL,
    actualizado_por     VARCHAR(150),
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, clave)
);
