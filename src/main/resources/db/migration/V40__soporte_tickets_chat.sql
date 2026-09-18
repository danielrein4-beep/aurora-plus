-- V40: Sistema de Tickets y Chat en Vivo de Soporte Tecnico entre Tenants y SuperAdmin

CREATE TABLE IF NOT EXISTS saas_soporte_tickets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    usuario_creador VARCHAR(100) NOT NULL,
    titulo_asunto VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'SOPORTE_TECNICO',
    prioridad VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
    agente_asignado VARCHAR(100),
    ultimo_mensaje TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_soporte_tickets_tenant ON saas_soporte_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_soporte_tickets_estado ON saas_soporte_tickets(estado);
CREATE INDEX IF NOT EXISTS idx_saas_soporte_tickets_fecha ON saas_soporte_tickets(fecha_actualizacion DESC);

CREATE TABLE IF NOT EXISTS saas_soporte_mensajes (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES saas_soporte_tickets(id) ON DELETE CASCADE,
    emisor_tipo VARCHAR(20) NOT NULL,
    emisor_nombre VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_envio TIMESTAMP NOT NULL DEFAULT NOW(),
    leido_por_destinatario BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_saas_soporte_mensajes_ticket ON saas_soporte_mensajes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_saas_soporte_mensajes_fecha ON saas_soporte_mensajes(fecha_envio ASC);

-- Semilla inicial de ticket para Centro Medico Tamanaco
INSERT INTO saas_soporte_tickets (tenant_id, nombre_empresa, usuario_creador, titulo_asunto, categoria, prioridad, estado, agente_asignado, ultimo_mensaje, fecha_creacion, fecha_actualizacion)
VALUES (
    1,
    'Centro Medico Tamanaco',
    'dr.mario',
    'Consulta sobre actualizacion a modulo de laboratorio',
    'CONFIGURACION',
    'MEDIA',
    'ABIERTO',
    'soporte-superadmin',
    'Hola equipo de Aurora Plus, queremos activar la seccion de bioanalisis para nuestros laboratorios asociados.',
    NOW() - INTERVAL '2 hour',
    NOW() - INTERVAL '30 minute'
) ON CONFLICT DO NOTHING;

INSERT INTO saas_soporte_mensajes (ticket_id, emisor_tipo, emisor_nombre, contenido, fecha_envio, leido_por_destinatario)
VALUES (
    1,
    'TENANT',
    'dr.mario',
    'Hola equipo de Aurora Plus, queremos activar la seccion de bioanalisis para nuestros laboratorios asociados.',
    NOW() - INTERVAL '2 hour',
    TRUE
),
(
    1,
    'SUPERADMIN',
    'Soporte Aurora Plus',
    'Hola Dr. Mario, con gusto. El modulo de laboratorio ya esta disponible en su plan de salud. Procedemos a habilitar los permisos en su consola.',
    NOW() - INTERVAL '30 minute',
    TRUE
) ON CONFLICT DO NOTHING;
