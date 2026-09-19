-- El catálogo público de Comercio ofrece "Delivery" vs "Retiro en Boutique" como
-- opciones de entrega, pero no existía ningún campo para el costo de envío en
-- ningún lado del sistema — elegir Delivery nunca sumaba nada al total, sin
-- importar la dirección. Se agrega como campo configurable (0 = gratis, el
-- comportamiento actual) en vez de una fórmula por distancia — eso puede venir
-- después si hace falta.
ALTER TABLE licencias_tenant ADD COLUMN IF NOT EXISTS costo_envio_delivery NUMERIC(18,2) NOT NULL DEFAULT 0;
