package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.services.DevolucionVentaService;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
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
        /** false = el cajero quitó el IVA en esta venta (queda en el libro con su usuario). Null = según el negocio. */
        public Boolean aplicaIva;
        /** Cargo de delivery en la moneda base. */
        public BigDecimal delivery;
        public String clienteRif;
    }

    @PostMapping("/ticket")
    public Map<String, Object> cobrarTicket(@RequestBody TicketRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio");
        RepuestoConversionService.ResultadoTicket r = repuestoConversionService.venderTicket(tenantId, req.numeroTicket, req.lineas,
            req.monedaPago, req.montoRecibido, req.pagos, req.vuelto, req.monedaVuelto, req.metodoPago,
            req.montoPagadoAhora, req.diasCredito, req.clienteId, req.nombreCliente,
            new RepuestoConversionService.OpcionesFiscales(req.aplicaIva, req.delivery, req.clienteRif,
                com.auroraplus.core.auth.AuthContext.getUsername()));
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("yaProcesado", r.yaProcesado());
        salida.put("total", r.total());
        salida.put("desglose", r.desglose());
        return salida;
    }

    @Autowired
    private DevolucionVentaService devolucionVentaService;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    /** Líneas de un ticket con lo ya devuelto de cada una, para armar la devolución. */
    @GetMapping("/ticket/{numero}/lineas")
    public List<DevolucionVentaService.LineaVendida> lineasTicket(@PathVariable String numero) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio");
        return devolucionVentaService.lineasDeTicket(tenantId, numero);
    }

    public static class DevolucionRequest {
        public String numeroTicket;
        public List<DevolucionVentaService.LineaDevolucion> lineas;
        public String motivo;
        /** Moneda en que se le devuelve el dinero al cliente (por defecto la moneda base). */
        public String monedaReembolso;
        /** EFECTIVO por defecto; PAGO_MOVIL, TRANSFERENCIA... no salen de la gaveta. */
        public String metodoReembolso;
        /** Clave única de esta devolución: un reintento no devuelve dos veces. */
        public String clave;
    }

    /** Devolución total o parcial de un ticket: sacar dinero de caja es sensible, así que no la hace cualquier rol. */
    @PostMapping("/devolucion")
    public DevolucionVentaService.ResultadoDevolucion devolver(@RequestBody DevolucionRequest req) {
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio");
        DevolucionVentaService.ResultadoDevolucion r = devolucionVentaService.devolver(tenantId, req.numeroTicket, req.lineas,
            req.motivo, req.monedaReembolso, req.metodoReembolso, req.clave);
        if (!r.yaProcesada()) {
            auditoriaService.registrar(tenantId, "COMERCIO", "DEVOLUCION", "VentaPOS", null,
                "Devolvió " + r.montoDevuelto() + " del ticket " + req.numeroTicket + " (" + req.motivo + ")");
        }
        return r;
    }
}
