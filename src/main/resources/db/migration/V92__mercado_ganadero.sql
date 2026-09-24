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
