-- Verificación de fincas para el Mercado Ganadero, por niveles:
--   mirar: cualquier finca con Ganadería
--   comprar / ofertar / chatear: ubicación de la finca + cédula del titular verificada
--   vender / publicar: además, registro de hierro verificado
--   título de propiedad o arrendamiento: opcional, suma confianza en la tarjeta del vendedor
CREATE TABLE IF NOT EXISTS mercado_verificaciones (
    tenant_id BIGINT PRIMARY KEY,
    titular_nombre VARCHAR(160),
    titular_cedula VARCHAR(30),
    numero_hierro VARCHAR(60),
    tipo_tierra VARCHAR(20),
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documentos privados: el contenido va cifrado (AES-GCM) y solo lo abre el equipo
-- verificador desde el SuperAdmin; ningún endpoint de fincas lo devuelve.
CREATE TABLE IF NOT EXISTS mercado_documentos_verificacion (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,              -- CEDULA, HIERRO, TIERRA
    estado VARCHAR(20) NOT NULL,            -- PENDIENTE, APROBADO, RECHAZADO
    nombre_archivo VARCHAR(200),
    tipo_contenido VARCHAR(80) NOT NULL,
    contenido_cifrado BYTEA NOT NULL,
    vector_inicial BYTEA NOT NULL,
    tamano_bytes INTEGER NOT NULL,
    subido_por VARCHAR(120),
    subido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_por VARCHAR(120),
    revisado_en TIMESTAMP,
    motivo_rechazo VARCHAR(500),
    CONSTRAINT uk_mercado_documento_tenant_tipo UNIQUE (tenant_id, tipo)
);
CREATE INDEX IF NOT EXISTS idx_mercado_documentos_estado ON mercado_documentos_verificacion (estado);

-- Quién abrió cada documento (cédulas y títulos son datos sensibles).
CREATE TABLE IF NOT EXISTS mercado_documentos_accesos (
    id BIGSERIAL PRIMARY KEY,
    documento_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    usuario VARCHAR(120) NOT NULL,
    accion VARCHAR(20) NOT NULL,            -- VER, APROBAR, RECHAZAR
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
