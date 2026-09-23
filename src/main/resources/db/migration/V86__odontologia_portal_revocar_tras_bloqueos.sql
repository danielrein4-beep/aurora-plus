-- V86: Portal del paciente odontologico - limite de bloqueos por enlace.
-- Con 5 intentos cada 15 minutos, los 4 digitos de la cedula (o el ano de nacimiento,
-- unas 100 opciones) se podian adivinar insistiendo por horas o dias. Tras 3 bloqueos
-- el enlace se desactiva y el paciente debe pedir uno nuevo a su clinica.
ALTER TABLE salud_odontologia_portal_enlaces
    ADD COLUMN IF NOT EXISTS bloqueos INTEGER NOT NULL DEFAULT 0;
