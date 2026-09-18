-- El PIN del Médico Titular (Mediclinic) vivía solo en localStorage del navegador,
-- comparado en el cliente — cualquiera podía leerlo o saltarse la verificación con
-- las herramientas de desarrollador. Ahora se guarda hasheado y se valida en el
-- servidor (ver ConfiguracionMedicaController).
CREATE TABLE salud_configuracion_medica (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL UNIQUE,
    clave_doctor_hash VARCHAR(255) NOT NULL,
    clave_doctor_personalizada BOOLEAN NOT NULL DEFAULT FALSE
);
