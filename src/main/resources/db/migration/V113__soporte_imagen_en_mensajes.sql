-- El cliente puede adjuntar una captura de pantalla del problema en el chat de soporte. La imagen
-- se guarda en el mensaje (data URL, comprimida en el teléfono) para no depender de archivos en el
-- disco del servidor, que se perderían al desplegar.
ALTER TABLE saas_soporte_mensajes ADD COLUMN IF NOT EXISTS imagen TEXT;
