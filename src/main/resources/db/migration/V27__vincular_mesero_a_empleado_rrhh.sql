-- Vínculo opcional de un mesero (directorio propio de Horeca) con un
-- Empleado real de RRHH — permite mostrar "en turno ahora" en Salón & Mesas
-- usando el reloj checador que ya existe, sin duplicar nada. Opcional a
-- propósito: un negocio chico puede seguir usando solo el directorio de
-- nombres sin llevar RRHH formal.
ALTER TABLE meseros_horeca ADD COLUMN empleado_id BIGINT;
