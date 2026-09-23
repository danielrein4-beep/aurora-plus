ALTER TABLE comercio_pedidos_web
    ADD COLUMN access_token VARCHAR(64),
    ADD COLUMN captura_pago_base64 TEXT;
