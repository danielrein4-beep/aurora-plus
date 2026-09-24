-- Correo y teléfono de cada cuenta de administración. Solo se guardan ya
-- verificados: agregarlos exige un código enviado al dato nuevo, y cambiarlos
-- o quitarlos exige además un código enviado al dato actual.
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS email VARCHAR(160);
ALTER TABLE usuarios_super_admin ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

CREATE TABLE IF NOT EXISTS superadmin_verificaciones_contacto (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES usuarios_super_admin(id) ON DELETE CASCADE,
    canal VARCHAR(10) NOT NULL,           -- EMAIL | TELEFONO
    accion VARCHAR(10) NOT NULL,          -- AGREGAR | CAMBIAR | QUITAR
    valor_nuevo VARCHAR(160),
    codigo_actual_hash VARCHAR(100),      -- enviado al dato vigente (CAMBIAR / QUITAR)
    codigo_nuevo_hash VARCHAR(100),       -- enviado al dato nuevo (AGREGAR / CAMBIAR)
    intentos INT NOT NULL DEFAULT 0,
    estado VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE | COMPLETADA | ANULADA
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_en TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_superadmin_verif_admin ON superadmin_verificaciones_contacto(admin_id, canal, estado);
