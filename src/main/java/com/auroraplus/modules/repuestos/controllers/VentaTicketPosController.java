package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Cobro del ticket completo del POS de Comercio (ver RepuestoConversionService.venderTicket). */
@RestController
@RequestMapping("/api/repuestos/ventas")
public class VentaTicketPosController {

    @Autowired
    private RepuestoConversionService repuestoConversionService;

    public static class TicketRequest {
        public String numeroTicket;
        public List<RepuestoConversionService.LineaTicket> lineas;
        public String monedaPago;
        public BigDecimal montoRecibido;
        public List<RepuestoConversionService.PagoTicket> pagos;
        public BigDecimal vuelto;
        public String monedaVuelto;
        /** Método del pago único (EFECTIVO, PAGO_MOVIL, TARJETA...): el arqueo solo cuenta el efectivo. */
        public String metodoPago;
        /** Venta a crédito: cuánto paga ahora (0 = todo a crédito). Null = contado. */
        public BigDecimal montoPagadoAhora;
        public Integer diasCredito;
        public Long clienteId;
        public String nombreCliente;
    }

    @PostMapping("/ticket")
    public Map<String, Object> cobrarTicket(@RequestBody TicketRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio");
        RepuestoConversionService.ResultadoTicket r = repuestoConversionService.venderTicket(tenantId, req.numeroTicket, req.lineas,
            req.monedaPago, req.montoRecibido, req.pagos, req.vuelto, req.monedaVuelto, req.metodoPago,
            req.montoPagadoAhora, req.diasCredito, req.clienteId, req.nombreCliente);
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("yaProcesado", r.yaProcesado());
        salida.put("total", r.total());
        return salida;
    }
}
