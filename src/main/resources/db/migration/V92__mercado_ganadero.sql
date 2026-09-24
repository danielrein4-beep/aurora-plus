-- Mercado ganadero: vitrina entre fincas de Aurora (solo tenants con Ganadería).
-- Reutiliza publicaciones_venta y ofertas_compra, que ya existían como registro
-- interno de cada finca, y les agrega lo necesario para que otra finca compre.

ALTER TABLE publicaciones_venta
    ADD COLUMN IF NOT EXISTS titulo VARCHAR(120),
    ADD COLUMN IF NOT EXISTS tipo_precio VARCHAR(15) NOT NULL DEFAULT 'POR_CABEZA', -- POR_CABEZA, POR_KG
    ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120),
    ADD COLUMN IF NOT EXISTS negociable BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS peso_publicado NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS miniatura_base64 TEXT,
    ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP,
    ADD COLUMN IF NOT EXISTS comprador_tenant_id BIGINT,
    ADD COLUMN IF NOT EXISTS precio_final NUMERIC(18, 2);

CREATE INDEX IF NOT EXISTS idx_publicaciones_venta_estado ON publicaciones_venta (estado, fecha_publicacion DESC);

ALTER TABLE ofertas_compra
    ADD COLUMN IF NOT EXISTS comprador_tenant_id BIGINT,
    ADD COLUMN IF NOT EXISTS comprador_usuario VARCHAR(80),
    ADD COLUMN IF NOT EXISTS mensaje VARCHAR(500),
    ADD COLUMN IF NOT EXISTS traspasado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ofertas_compra_publicacion ON ofertas_compra (publicacion_id, estado);

-- Fotos de la publicación. En base64 como el resto de imágenes de la app
-- (logos, banners, capturas de pago): no dependen de una carpeta del servidor.
CREATE TABLE IF NOT EXISTS mercado_ganado_fotos (
    id BIGSERIAL PRIMARY KEY,
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones_venta (id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL,
    imagen_base64 TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mercado_ganado_fotos_pub ON mercado_ganado_fotos (publicacion_id, orden);

-- Chat interno: una conversación es (publicación, finca compradora).
CREATE TABLE IF NOT EXISTS mercado_ganado_mensajes (
    id BIGSERIAL PRIMARY KEY,
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones_venta (id) ON DELETE CASCADE,
    comprador_tenant_id BIGINT NOT NULL,
    emisor_tenant_id BIGINT NOT NULL,
    emisor_nombre VARCHAR(120),
    contenido VARCHAR(2000) NOT NULL,
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mercado_ganado_mensajes_conv ON mercado_ganado_mensajes (publicacion_id, comprador_tenant_id, fecha);

-- Las comisiones se cobran en la siguiente factura de Aurora: al registrar ese
-- pago quedan enlazadas a él.
ALTER TABLE comisiones_plataforma
    ADD COLUMN IF NOT EXISTS descripcion VARCHAR(200),
    ADD COLUMN IF NOT EXISTS pago_id BIGINT;

-- ───────── Mercado dedicado: categorías, reputación y protección de la comisión ─────────

-- PADROTE, VACA_PARIDA, VACA_ORDENO, NOVILLA, MAUTE, CEBA
ALTER TABLE publicaciones_venta
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(20),
    ADD COLUMN IF NOT EXISTS estado_region VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_publicaciones_venta_categoria ON publicaciones_venta (categoria, estado);

-- Animales que una finca guardó para mirar después.
CREATE TABLE IF NOT EXISTS mercado_ganado_guardados (
    tenant_id BIGINT NOT NULL,
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones_venta (id) ON DELETE CASCADE,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, publicacion_id)
);

-- Calificación que cada parte deja a la otra tras un trato cerrado en Aurora.
CREATE TABLE IF NOT EXISTS mercado_ganado_calificaciones (
    id BIGSERIAL PRIMARY KEY,
    oferta_id BIGINT NOT NULL REFERENCES ofertas_compra (id) ON DELETE CASCADE,
    calificador_tenant_id BIGINT NOT NULL,
    calificado_tenant_id BIGINT NOT NULL,
    estrellas INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario VARCHAR(500),
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (oferta_id, calificador_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_mercado_calificaciones_calificado ON mercado_ganado_calificaciones (calificado_tenant_id);

-- Intentos de pasar datos de contacto por el chat o la publicación antes de
-- cerrar el trato: el texto se tapa y queda aquí para el super-admin.
CREATE TABLE IF NOT EXISTS mercado_ganado_alertas (
    id BIGSERIAL PRIMARY KEY,
    publicacion_id BIGINT REFERENCES publicaciones_venta (id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL,
    otra_parte_tenant_id BIGINT,
    tipo VARCHAR(30) NOT NULL, -- CONTACTO_EN_CHAT, CONTACTO_EN_PUBLICACION
    contenido_original VARCHAR(2000),
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mercado_alertas_fecha ON mercado_ganado_alertas (fecha DESC);

-- Aceptación de las condiciones del mercado (la comisión aplica aunque el
-- trato que nació aquí se cierre por fuera).
CREATE TABLE IF NOT EXISTS mercado_ganado_condiciones (
    tenant_id BIGINT PRIMARY KEY,
    usuario VARCHAR(120),
    version INTEGER NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fincas suspendidas del mercado por incumplir sus condiciones (p. ej. cerrar
-- por fuera un trato que nació aquí). No afecta el resto de Aurora.
CREATE TABLE IF NOT EXISTS mercado_ganado_suspensiones (
    tenant_id BIGINT PRIMARY KEY,
    motivo VARCHAR(500) NOT NULL,
    suspendido_por VARCHAR(120),
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Venta por lotes: una publicación puede llevar varios animales (animal_id
-- queda como el animal de portada). El precio por cabeza o por kilo se
-- multiplica por el lote; la oferta es por el lote completo.
ALTER TABLE publicaciones_venta
    ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS peso_total NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS mercado_ganado_lote_animales (
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones_venta (id) ON DELETE CASCADE,
    animal_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    PRIMARY KEY (publicacion_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_mercado_lote_animal ON mercado_ganado_lote_animales (animal_id);
