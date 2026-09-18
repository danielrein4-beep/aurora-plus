-- Bitácora de auditoría única, transversal a las 5 verticales — ver RegistroAuditoria.
CREATE TABLE core_registro_auditoria (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    modulo VARCHAR(40) NOT NULL,
    accion VARCHAR(30) NOT NULL,
    entidad VARCHAR(60) NOT NULL,
    entidad_id VARCHAR(100),
    descripcion VARCHAR(500) NOT NULL,
    usuario VARCHAR(100) NOT NULL,
    rol_usuario VARCHAR(30)
);

CREATE INDEX idx_auditoria_tenant_fecha ON core_registro_auditoria (tenant_id, fecha DESC);
