-- Borrador editable del mensaje de recordatorio de cita por WhatsApp. Cada médico lo
-- personaliza una sola vez (costo de consulta, método de pago, hora de llegada varían
-- por consultorio) y el sistema solo rellena saludo/paciente/fecha/hora al enviarlo.
ALTER TABLE salud_configuracion_medica ADD COLUMN plantilla_recordatorio_cita TEXT;
