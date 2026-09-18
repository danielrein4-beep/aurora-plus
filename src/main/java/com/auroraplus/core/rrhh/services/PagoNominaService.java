package com.auroraplus.core.rrhh.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.rrhh.entities.Empleado;
import com.auroraplus.core.rrhh.entities.PagoNomina;
import com.auroraplus.core.rrhh.repositories.EmpleadoRepository;
import com.auroraplus.core.rrhh.repositories.PagoNominaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Efectúa un pago de nómina de verdad: además de dejar el comprobante
 * (PagoNomina), registra el egreso real en caja (MotorFinancieroService) para
 * que el gasto se refleje en Ingresos & Gastos, Cierre de Caja y cualquier
 * reporte financiero — un pago de nómina que no sale de caja no es un pago
 * real para el dueño del negocio.
 */
@Service
public class PagoNominaService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private PagoNominaRepository pagoNominaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Transactional
    public PagoNomina registrarPago(Long tenantId, Long empleadoId, LocalDate periodoDesde, LocalDate periodoHasta,
                                     BigDecimal horasTrabajadas, BigDecimal monto, String moneda) {
        Empleado empleado = empleadoRepository.findById(empleadoId)
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));
        if (!empleado.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Empleado no pertenece a este tenant");
        }
        if (periodoDesde == null || periodoHasta == null || periodoHasta.isBefore(periodoDesde)) {
            throw new RuntimeException("Rango de período inválido");
        }
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto a pagar debe ser mayor a cero");
        }
        if (moneda == null || moneda.isBlank()) {
            throw new RuntimeException("Indique la moneda del pago");
        }
        if (pagoNominaRepository.existeSolapado(empleadoId, periodoDesde, periodoHasta)) {
            throw new RuntimeException("Ya existe un pago registrado para " + empleado.getNombre()
                + " que se solapa con este período — revisa el historial de pagos");
        }

        PagoNomina pago = new PagoNomina();
        pago.setTenantId(tenantId);
        pago.setEmpleadoId(empleado.getId());
        pago.setNombreEmpleado(empleado.getNombre());
        pago.setCedulaEmpleado(empleado.getCedula());
        pago.setCargoEmpleado(empleado.getCargo());
        pago.setPeriodoDesde(periodoDesde);
        pago.setPeriodoHasta(periodoHasta);
        pago.setTipoControl(empleado.getTipoControl());
        pago.setHorasTrabajadas(horasTrabajadas);
        pago.setMonto(monto);
        pago.setMoneda(moneda);
        pago.setFechaPago(LocalDateTime.now());
        pago = pagoNominaRepository.save(pago);

        String concepto = "Nómina: " + empleado.getNombre() + " (" + periodoDesde.format(FMT) + " a " + periodoHasta.format(FMT) + ")";
        MovimientoCaja movimiento = motorFinancieroService.registrarMovimientoEnMoneda(
            tenantId, MovimientoCaja.TipoMovimiento.EGRESO, monto, moneda, concepto,
            "RRHH_NOMINA", "PagoNomina", pago.getId());

        pago.setMovimientoCajaId(movimiento.getId());
        return pagoNominaRepository.save(pago);
    }
}
