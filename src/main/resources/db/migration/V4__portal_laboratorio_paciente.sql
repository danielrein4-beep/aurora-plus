-- Rediseño de "Red Laboratorios & Inbox": el paciente sube sus resultados de
-- laboratorio (foto/PDF) escaneando un QR fijo del consultorio, en vez de que
-- el doctor emita una "orden digital" que nadie usa (los doctores entregan
-- órdenes impresas del propio laboratorio). Ver InboxLaboratorioMedico.tsx y
-- PortalLaboratorioPacienteService.

-- Token público fijo por consultorio (uno solo, reutilizado en todos los
-- informes impresos) — igual que OrdenLaboratorio.tokenSeguro, pero uno por
-- tenant en vez de uno por orden. Se genera perezosamente la primera vez que
-- se pide (ver PortalLaboratorioPacienteService.obtenerOCrearToken), así que
-- puede quedar NULL para tenants que nunca lo usen.
ALTER TABLE configuracion_tenant ADD COLUMN token_portal_laboratorio VARCHAR(64) UNIQUE;

-- Una fila por cada carga que hace un paciente desde el portal público (puede
-- traer varios archivos). paciente_id queda NULL si la cédula que escribió no
-- coincide con ningún paciente del tenant — se muestra "sin identificar" en
-- el inbox hasta que el doctor/secretaria la vincule a mano.
CREATE TABLE salud_examenes_recibidos_paciente (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    paciente_id BIGINT NULL REFERENCES salud_pacientes(id),
    cedula_ingresada VARCHAR(30) NOT NULL,
    nombre_ingresado VARCHAR(150),
    telefono_ingresado VARCHAR(30),
    fecha_hora_recepcion TIMESTAMP NOT NULL DEFAULT now(),
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_hora_leido TIMESTAMP NULL,
    leido_por VARCHAR(100)
);
CREATE INDEX idx_salud_exrec_tenant ON salud_examenes_recibidos_paciente(tenant_id);
CREATE INDEX idx_salud_exrec_tenant_paciente ON salud_examenes_recibidos_paciente(tenant_id, paciente_id);
CREATE INDEX idx_salud_exrec_tenant_leido ON salud_examenes_recibidos_paciente(tenant_id, leido);

-- Archivos adjuntos de cada carga (sin límite de cantidad — "a veces son más
-- de 5 PDFs"). Mismo patrón de almacenamiento que salud_adjuntos_resultado_lab
-- (TEXT en base64): consistente con el resto del sistema, aunque hay que
-- vigilar el tamaño de la base si el volumen crece mucho (candidato futuro a
-- mover a almacenamiento de objetos, no en el alcance de este cambio).
CREATE TABLE salud_archivos_examen_recibido (
    id BIGSERIAL PRIMARY KEY,
    examen_id BIGINT NOT NULL REFERENCES salud_examenes_recibidos_paciente(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL,
    nombre_archivo VARCHAR(200) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    contenido_base64 TEXT NOT NULL,
    orden INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_salud_archex_tenant ON salud_archivos_examen_recibido(tenant_id);
CREATE INDEX idx_salud_archex_examen ON salud_archivos_examen_recibido(examen_id);
