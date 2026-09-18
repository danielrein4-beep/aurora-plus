-- Motor de personalización de PDFs: el perfil médico (nombre, especialidad, matrícula,
-- colegio, texto de encabezado y firma electrónica) vivía solo en localStorage del
-- navegador — cada doctor que abría sesión en otro dispositivo veía el membrete por
-- defecto. Ahora se guarda por tenant en el servidor y se inyecta en cada PDF.
-- clave_doctor_hash pasa a ser nullable: el perfil de membrete puede guardarse antes de
-- que el médico configure su primer PIN.
ALTER TABLE salud_configuracion_medica ALTER COLUMN clave_doctor_hash DROP NOT NULL;
ALTER TABLE salud_configuracion_medica ADD COLUMN doctor_nombre VARCHAR(255);
ALTER TABLE salud_configuracion_medica ADD COLUMN especialidad VARCHAR(255);
ALTER TABLE salud_configuracion_medica ADD COLUMN matricula_mpps VARCHAR(100);
ALTER TABLE salud_configuracion_medica ADD COLUMN colegio_medicos VARCHAR(100);
ALTER TABLE salud_configuracion_medica ADD COLUMN encabezado_texto TEXT;
ALTER TABLE salud_configuracion_medica ADD COLUMN firma_base64 TEXT;
