package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
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
    public ResponseEntity<MovimientoCaja> registrar(@RequestParam Long tenantId, @RequestBody RegistrarMovimientoRequest request) {
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
    public List<MovimientoCaja> listar(@RequestParam Long tenantId,
                                        @RequestParam(required = false) MovimientoCaja.TipoMovimiento tipo) {
        return tipo != null
            ? movimientoCajaRepository.findByTenantIdAndTipoOrderByFechaRegistroDesc(tenantId, tipo)
            : movimientoCajaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantId);
    }

    public static class AbonarRequest {
        public BigDecimal monto;
        public String moneda;
    }

    /** Registra un pago (total o parcial) sobre una cuenta por pagar/cobrar existente. */
    @PostMapping("/{id}/abonar")
    public ResponseEntity<MovimientoCaja> abonar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody AbonarRequest request) {
        return ResponseEntity.ok(motorFinancieroService.abonarMovimiento(tenantId, id, request.monto, request.moneda));
    }
}
