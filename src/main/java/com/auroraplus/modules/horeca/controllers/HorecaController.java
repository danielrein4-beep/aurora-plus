package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
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

    @PostMapping("/comandas/abrir")
    public ResponseEntity<Comanda> abrirComanda(
            @RequestParam Long tenantId,
            @RequestParam(required = false) Integer numeroMesa,
            @RequestParam String mesero,
            @RequestParam(required = false) String canal,
            @RequestParam(required = false) String nombreCliente,
            @RequestParam(required = false) String telefonoCliente,
            @RequestParam(required = false) String direccionEntrega,
            @RequestParam(required = false) String mensajero,
            @RequestParam(required = false) String claveIdempotencia) {
        return ResponseEntity.ok(horecaService.aperturarComanda(
            tenantId, numeroMesa, mesero, canal, nombreCliente, telefonoCliente, direccionEntrega, mensajero, claveIdempotencia));
    }

    @PostMapping("/comandas/{comandaId}/consumo")
    public ResponseEntity<Comanda> agregarConsumo(
            @PathVariable Long comandaId,
            @RequestParam Long tenantId,
            @RequestParam BigDecimal montoItem) {
        return ResponseEntity.ok(horecaService.agregarConsumo(comandaId, tenantId, montoItem));
    }

    @PostMapping("/comandas/{comandaId}/mesero")
    public ResponseEntity<Comanda> reasignarMesero(
            @PathVariable Long comandaId,
            @RequestParam Long tenantId,
            @RequestParam String nuevoMesero) {
        return ResponseEntity.ok(horecaService.asignarMesero(comandaId, tenantId, nuevoMesero));
    }

    @PostMapping("/comandas/{comandaId}/dividir")
    public ResponseEntity<List<BigDecimal>> dividirCuenta(
            @PathVariable Long comandaId,
            @RequestParam Long tenantId,
            @RequestParam int numeroPersonas) {
        return ResponseEntity.ok(horecaService.dividirCuenta(comandaId, tenantId, numeroPersonas));
    }

    @PostMapping("/comandas/{comandaId}/cerrar")
    public ResponseEntity<Comanda> cerrarComanda(
            @PathVariable Long comandaId,
            @RequestParam Long tenantId,
            @RequestParam String metodoPago,
            @RequestParam(required = false) String monedaPago,
            @RequestParam(required = false) BigDecimal montoRecibido,
            @RequestParam(required = false) String claveIdempotencia) {
        return ResponseEntity.ok(horecaService.cerrarComanda(comandaId, tenantId, metodoPago, monedaPago, montoRecibido, claveIdempotencia));
    }

    /** Cobro mixto: la comanda se cierra con varias líneas de pago a la vez (ej. parte USD efectivo + resto Bs Pago Móvil). */
    @PostMapping("/comandas/{comandaId}/cerrar-mixto")
    public ResponseEntity<ResultadoCobroMixto> cerrarComandaMixto(
            @PathVariable Long comandaId,
            @RequestParam Long tenantId,
            @RequestParam(required = false) String monedaVuelto,
            @RequestParam(required = false) String claveIdempotencia,
            @RequestBody List<HorecaService.PagoParcialRequest> pagos) {
        return ResponseEntity.ok(horecaService.cerrarComandaMixto(comandaId, tenantId, pagos, monedaVuelto, claveIdempotencia));
    }

    @PostMapping("/comandas/{comandaId}/items")
    public ResponseEntity<ItemComanda> agregarItem(
            @PathVariable Long comandaId,
            @RequestParam Long tenantId,
            @RequestParam(required = false) Long escandalloId,
            @RequestParam(required = false) Long articuloId,
            @RequestParam(required = false) String nombrePlato,
            @RequestParam(required = false) String estacionCocina,
            @RequestParam BigDecimal cantidad,
            @RequestParam(required = false) BigDecimal precioUnitario,
            @RequestParam(required = false) String claveIdempotencia) {
        return ResponseEntity.ok(horecaService.agregarItemComanda(
            comandaId, tenantId, escandalloId, articuloId, nombrePlato, estacionCocina, cantidad, precioUnitario, claveIdempotencia));
    }

    @PatchMapping("/items/{itemId}/estado")
    public ResponseEntity<ItemComanda> actualizarEstadoItem(
            @PathVariable Long itemId,
            @RequestParam Long tenantId,
            @RequestParam ItemComanda.EstadoItem nuevoEstado) {
        return ResponseEntity.ok(horecaService.actualizarEstadoItem(itemId, tenantId, nuevoEstado));
    }

    @GetMapping("/kds/{estacionCocina}")
    public ResponseEntity<List<ItemComanda>> obtenerTableroKds(@PathVariable String estacionCocina, @RequestParam Long tenantId) {
        return ResponseEntity.ok(horecaService.obtenerTableroKds(tenantId, estacionCocina));
    }

    /** Utilidad por producto del día (o de la fecha indicada) — para el resumen diario de Administración. */
    @GetMapping("/reportes/utilidad-diaria")
    public ResponseEntity<List<ResumenUtilidadProducto>> utilidadDiaria(
            @RequestParam Long tenantId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(horecaService.obtenerUtilidadDiaria(tenantId, fecha));
    }

    @GetMapping(value = "/comandas/{comandaId}/ticket", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> ticket(@PathVariable Long comandaId, @RequestParam Long tenantId) throws Exception {
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
}
