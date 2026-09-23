-- itemsJson (comercio_pedidos_web.items_json) es texto de despliegue para el humano
-- ("2x Martillo ($20.00); "), nunca fue pensado para parsear programaticamente. Sin una
-- version estructurada, "Confirmar" un pedido web no podia descontar inventario real ni
-- registrar la venta en caja — solo cambiaba una etiqueta de estado. Esta columna guarda
-- el mismo pedido en JSON real (productoId/cantidad) para que ConfirmacionPedidoWebService
-- pueda reproducir la venta contra el motor real (RepuestoConversionService), igual que una
-- venta de mostrador.
ALTER TABLE comercio_pedidos_web
    ADD COLUMN items_estructurados_json TEXT;
