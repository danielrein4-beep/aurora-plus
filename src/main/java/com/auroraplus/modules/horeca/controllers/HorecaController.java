package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.pagos.BinancePayService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import com.auroraplus.modules.horeca.services.ComandaEscPosService;
import com.auroraplus.modules.horeca.services.ComandaPdfService;
import com.auroraplus.modules.horeca.services.HorecaService;
import com.auroraplus.modules.horeca.services.ResultadoCobroMixto;
import com.auroraplus.modules.horeca.services.ResumenUtilidadProducto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/horeca/mesas")
public class HorecaController {

    @Autowired
    private HorecaService horecaService;

    @Autowired
    private ItemComandaRepository itemComandaRepository;

    @Autowired
    private ComandaPdfService comandaPdfService;

    @Autowired
    private ComandaEscPosService comandaEscPosService;

    @Autowired
    private BinancePayService binancePayService;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    @PostMapping("/comandas/abrir")
    public ResponseEntity<Comanda> abrirComanda(
            @RequestParam(required = false) Integer numeroMesa,
            @RequestParam String mesero,
            @RequestParam(required = false) String canal,
            @RequestParam(required = false) String nombreCliente,
            @RequestParam(required = false) String telefonoCliente,
            @RequestParam(required = false) String direccionEntrega,
            @RequestParam(required = false) String mensajero,
            @RequestParam(required = false) String claveIdempotencia,
            @RequestParam(required = false) Long clienteId) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(horecaService.aperturarComanda(
            tenantId, numeroMesa, mesero, canal, nombreCliente, telefonoCliente, direccionEntrega, mensajero, claveIdempotencia, clienteId));
    }

    @PostMapping("/comandas/{comandaId}/consumo")
    public ResponseEntity<Comanda> agregarConsumo(
            @PathVariable Long comandaId,
            @RequestParam BigDecimal montoItem) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(horecaService.agregarConsumo(comandaId, tenantId, montoItem));
    }

    @PostMapping("/comandas/{comandaId}/mesero")
    public ResponseEntity<Comanda> reasignarMesero(
            @PathVariable Long comandaId,
            @RequestParam String nuevoMesero) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(horecaService.asignarMesero(comandaId, tenantId, nuevoMesero));
    }

    @PostMapping("/comandas/{comandaId}/dividir")
    public ResponseEntity<List<BigDecimal>> dividirCuenta(
            @PathVariable Long comandaId,
            @RequestParam int numeroPersonas) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(horecaService.dividirCuenta(comandaId, tenantId, numeroPersonas));
    }

    @PostMapping("/comandas/{comandaId}/cerrar")
    public ResponseEntity<Comanda> cerrarComanda(
            @PathVariable Long comandaId,
            @RequestParam String metodoPago,
            @RequestParam(required = false) String monedaPago,
            @RequestParam(required = false) BigDecimal montoRecibido,
            @RequestParam(required = false) String claveIdempotencia) {
        return ResponseEntity.ok(horecaService.cerrarComanda(comandaId, TenantContext.getCurrentTenant(), metodoPago, monedaPago, montoRecibido, claveIdempotencia));
    }

    /** Cobro mixto: la comanda se cierra con varias líneas de pago a la vez (ej. parte USD efectivo + resto Bs Pago Móvil). */
    @PostMapping("/comandas/{comandaId}/cerrar-mixto")
    public ResponseEntity<ResultadoCobroMixto> cerrarComandaMixto(
            @PathVariable Long comandaId,
            @RequestParam(required = false) String monedaVuelto,
            @RequestParam(required = false) String claveIdempotencia,
            @RequestBody List<HorecaService.PagoParcialRequest> pagos) {
        return ResponseEntity.ok(horecaService.cerrarComandaMixto(comandaId, TenantContext.getCurrentTenant(), pagos, monedaVuelto, claveIdempotencia));
    }

    /** Anula una comanda ABIERTA o PAGADA: revierte inventario/recetas y, si ya estaba cobrada, también la caja. Nunca borra nada.
     * Reservado a Dueño/Administrador y Cajero — un mesero no puede anular una venta por su cuenta. */
    @PostMapping("/comandas/{comandaId}/anular")
    public ResponseEntity<Comanda> anularComanda(
            @PathVariable Long comandaId,
            @RequestParam String motivo,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String claveIdempotencia) {
        AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR");
        Long tenantId = TenantContext.getCurrentTenant();
        Comanda resultado = horecaService.anularComanda(comandaId, tenantId, motivo, usuario, claveIdempotencia);
        auditoriaService.registrar(tenantId, "HORECA", "ELIMINAR", "Comanda", comandaId, "Anuló una comanda — motivo: " + motivo);
        return ResponseEntity.ok(resultado);
    }

    /** Anula UN ítem de una comanda todavía ABIERTA (no toda la comanda) — exige motivo y queda con usuario/fecha.
     * Mismo criterio de permisos que anular la comanda completa: nunca un mesero solo. */
    @PostMapping("/items/{itemId}/anular")
    public ResponseEntity<ItemComanda> anularItem(
            @PathVariable Long itemId,
            @RequestParam String motivo,
            @RequestParam(required = false) String usuario) {
        AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR");
        Long tenantId = TenantContext.getCurrentTenant();
        ItemComanda resultado = horecaService.anularItem(itemId, tenantId, motivo, usuario);
        auditoriaService.registrar(tenantId, "HORECA", "ELIMINAR", "ItemComanda", itemId, "Anuló un ítem de comanda — motivo: " + motivo);
        return ResponseEntity.ok(resultado);
    }

    @PostMapping("/comandas/{comandaId}/items")
    public ResponseEntity<ItemComanda> agregarItem(
            @PathVariable Long comandaId,
            @RequestParam(required = false) Long escandalloId,
            @RequestParam(required = false) Long articuloId,
            @RequestParam(required = false) Long fastBarTragoId,
            @RequestParam(required = false) String nombrePlato,
            @RequestParam(required = false) String estacionCocina,
            @RequestParam BigDecimal cantidad,
            @RequestParam(required = false) BigDecimal precioUnitario,
            @RequestParam(required = false) String claveIdempotencia,
            @RequestParam(required = false) String notas) {
        return ResponseEntity.ok(horecaService.agregarItemComanda(
            comandaId, TenantContext.getCurrentTenant(), escandalloId, articuloId, fastBarTragoId, nombrePlato, estacionCocina, cantidad, precioUnitario, claveIdempotencia, notas));
    }

    @PatchMapping("/items/{itemId}/estado")
    public ResponseEntity<ItemComanda> actualizarEstadoItem(
            @PathVariable Long itemId,
            @RequestParam ItemComanda.EstadoItem nuevoEstado) {
        return ResponseEntity.ok(horecaService.actualizarEstadoItem(itemId, TenantContext.getCurrentTenant(), nuevoEstado));
    }

    @GetMapping("/kds/{estacionCocina}")
    public ResponseEntity<List<com.auroraplus.modules.horeca.services.ItemKdsDTO>> obtenerTableroKds(@PathVariable String estacionCocina) {
        return ResponseEntity.ok(horecaService.obtenerTableroKds(TenantContext.getCurrentTenant(), estacionCocina));
    }

    /** Utilidad por producto del día (o de la fecha indicada) — para el resumen diario de Administración. */
    @GetMapping("/reportes/utilidad-diaria")
    public ResponseEntity<List<ResumenUtilidadProducto>> utilidadDiaria(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(horecaService.obtenerUtilidadDiaria(TenantContext.getCurrentTenant(), fecha));
    }

    /**
     * Genera una orden de cobro con Binance Pay por el total ACTUAL de la
     * comanda (no cierra nada todavía) — el cliente paga desde su app
     * Binance, y el cierre real ocurre cuando llega el webhook de
     * confirmación (ver BinancePayWebhookController), por el mismo camino
     * de siempre (cerrarComandaMixto). Solo aparece disponible si el
     * negocio activó Binance Pay en su Configuración.
     */
    @PostMapping("/comandas/{comandaId}/pagar-binance")
    public ResponseEntity<BinancePayService.OrdenBinancePay> pagarConBinance(@PathVariable Long comandaId) {
        Long tenantId = TenantContext.getCurrentTenant();
        Comanda comanda = horecaService.obtenerComanda(comandaId);
        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        if (comanda.getEstado() != Comanda.EstadoComanda.ABIERTA) {
            throw new RuntimeException("Solo se puede generar un cobro Binance Pay para una comanda ABIERTA");
        }
        String merchantTradeNo = "HORECA-" + tenantId + "-" + comandaId + "-" + System.currentTimeMillis();
        String descripcion = "Comanda " + (comanda.getNumeroMesa() != null ? "Mesa " + comanda.getNumeroMesa() : "#" + comandaId);
        return ResponseEntity.ok(binancePayService.crearOrden(tenantId, merchantTradeNo, comanda.getTotalConsumo(), descripcion));
    }

    @GetMapping(value = "/comandas/{comandaId}/ticket", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> ticket(@PathVariable Long comandaId) throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        Comanda comanda = horecaService.obtenerComanda(comandaId);
        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        List<ItemComanda> items = itemComandaRepository.findByComandaId(comandaId);
        byte[] pdf = comandaPdfService.generarTicket(comanda, items);
        String identificador = comanda.getNumeroMesa() != null ? "mesa-" + comanda.getNumeroMesa() : "comanda-" + comanda.getId();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"ticket-" + identificador + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    /**
     * Mismo ticket, pero como comandos ESC/POS crudos en vez de PDF — para
     * enviarlo directo a una impresora térmica por Web Serial/WebUSB desde el
     * navegador, sin pasar por el diálogo de impresión del sistema operativo.
     */
    @GetMapping(value = "/comandas/{comandaId}/ticket-escpos", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> ticketEscPos(@PathVariable Long comandaId) throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        Comanda comanda = horecaService.obtenerComanda(comandaId);
        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        List<ItemComanda> items = itemComandaRepository.findByComandaId(comandaId);
        byte[] bytesEscPos = comandaEscPosService.generarTicket(comanda, items);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(bytesEscPos);
    }
}
