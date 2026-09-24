package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Registro manual de ingresos y gastos — todos los movimientos de caja hasta
 * ahora nacían como efecto secundario de una acción de negocio (cerrar una
 * comanda, cobrar una consulta, vender un trago). No existía forma de
 * anotar un gasto suelto (ej. "pagué la electricidad", "compré hielo para
 * el bar") ni un ingreso que no viniera de una venta del sistema. Es
 * genérico a nivel core.financiero — cualquier vertical lo puede usar, no
 * solo Horeca.
 */
@RestController
@RequestMapping("/api/financiero/movimientos")
public class MovimientoCajaController {

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    public static class RegistrarMovimientoRequest {
        public MovimientoCaja.TipoMovimiento tipo; // INGRESO o EGRESO para un registro manual
        public BigDecimal monto;
        public String moneda;
        public String concepto;
    }

    @PostMapping
    public ResponseEntity<MovimientoCaja> registrar(@RequestBody RegistrarMovimientoRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA");
        if (request.tipo != MovimientoCaja.TipoMovimiento.INGRESO && request.tipo != MovimientoCaja.TipoMovimiento.EGRESO) {
            throw new RuntimeException("Solo se pueden registrar movimientos manuales de tipo INGRESO o EGRESO");
        }
        if (request.monto == null || request.monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto debe ser mayor a cero");
        }
        if (request.moneda == null || request.moneda.isBlank()) {
            throw new RuntimeException("La moneda es obligatoria");
        }
        if (request.concepto == null || request.concepto.isBlank()) {
            throw new RuntimeException("El concepto es obligatorio para poder identificar el movimiento después");
        }
        return ResponseEntity.ok(motorFinancieroService.registrarMovimientoEnMoneda(
            tenantId, request.tipo, request.monto, request.moneda, request.concepto));
    }

    /** Historial de movimientos del tenant, más recientes primero. Filtra por tipo si se indica. */
    @GetMapping
    public List<MovimientoCaja> listar(@RequestParam(required = false) MovimientoCaja.TipoMovimiento tipo) {
        Long tenantId = TenantContext.getCurrentTenant();
        return tipo != null
            ? movimientoCajaRepository.findByTenantIdAndTipoOrderByFechaRegistroDesc(tenantId, tipo)
            : movimientoCajaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantId);
    }

    public static class RegistrarCuentaManualRequest {
        public MovimientoCaja.TipoMovimiento tipo; // CXC o CXP para una cuenta manual (ej. "pagué la luz a crédito")
        public BigDecimal monto;
        public String concepto;
        public String entidadNombre; // proveedor/cliente — se anexa al concepto, mismo formato que las CXC/CXP automáticas
        public Integer diasCredito;
    }

    /**
     * Cuenta por cobrar/pagar manual, NO ligada a una venta o compra real (ej. "pagué la
     * luz a crédito", "le presté $50 a un cliente"). El endpoint `registrar()` de arriba
     * rechaza CXC/CXP a propósito porque esas nacen normalmente como efecto secundario de
     * una operación de inventario (ver RepuestoCompraService/RepuestoConversionService,
     * con trazabilidad real hacia la factura/venta) — esto es la válvula de escape explícita
     * para cuando de verdad no hay una operación de inventario detrás.
     */
    @PostMapping("/cuenta")
    public ResponseEntity<MovimientoCaja> registrarCuentaManual(@RequestBody RegistrarCuentaManualRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA");
        if (request.tipo != MovimientoCaja.TipoMovimiento.CXC && request.tipo != MovimientoCaja.TipoMovimiento.CXP) {
            throw new RuntimeException("Este endpoint solo registra cuentas manuales de tipo CXC o CXP");
        }
        if (request.monto == null || request.monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto debe ser mayor a cero");
        }
        if (request.concepto == null || request.concepto.isBlank()) {
            throw new RuntimeException("El concepto es obligatorio para poder identificar la cuenta después");
        }
        String marcador = request.tipo == MovimientoCaja.TipoMovimiento.CXC ? " — Cliente: " : " — Proveedor: ";
        String conceptoCompleto = request.entidadNombre != null && !request.entidadNombre.isBlank()
            ? request.concepto + marcador + request.entidadNombre
            : request.concepto;
        LocalDate fechaVencimiento = (request.diasCredito != null && request.diasCredito > 0)
            ? LocalDate.now().plusDays(request.diasCredito) : null;
        return ResponseEntity.ok(motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantId, request.tipo, request.monto, null, null, conceptoCompleto,
            "COMERCIO", "MANUAL", null, fechaVencimiento));
    }

    public static class AbonarRequest {
        public BigDecimal monto;
        public String moneda;
    }

    /** Registra un pago (total o parcial) sobre una cuenta por pagar/cobrar existente. */
    @PostMapping("/{id}/abonar")
    public ResponseEntity<MovimientoCaja> abonar(@PathVariable Long id, @RequestBody AbonarRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA");
        return ResponseEntity.ok(motorFinancieroService.abonarMovimiento(tenantId, id, request.monto, request.moneda));
    }

    public static class ComprobantePagoRequest {
        public String capturaBase64;
    }

    /**
     * Adjunta la captura del pago (Pago Móvil, Zelle, transferencia, etc.) al
     * movimiento de caja real de una venta — este registro es el único lugar
     * donde una venta del POS vive de forma duradera en el servidor (el ticket
     * línea por línea solo vive en localStorage del navegador del cajero), así
     * que es el ancla correcta: el comprobante no se pierde al cambiar de
     * dispositivo o limpiar caché.
     */
    @PostMapping("/{id}/comprobante")
    public ResponseEntity<?> subirComprobante(@PathVariable Long id, @RequestBody ComprobantePagoRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA");
        if (request.capturaBase64 == null || request.capturaBase64.isBlank() || !request.capturaBase64.startsWith("data:image")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "La captura debe ser una imagen válida"));
        }
        MovimientoCaja movimiento = movimientoCajaRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new RuntimeException("Movimiento de caja no encontrado"));
        movimiento.setCapturaPagoBase64(request.capturaBase64);
        return ResponseEntity.ok(movimientoCajaRepository.save(movimiento));
    }
}
