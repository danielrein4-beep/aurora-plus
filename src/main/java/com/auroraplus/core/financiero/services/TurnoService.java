package com.auroraplus.core.financiero.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.entities.Turno;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.repositories.TurnoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Control de Caja por Turnos: apertura con monto base, registro de egresos
 * (validando que haya una caja realmente abierta) y Cierre Z que compara lo
 * vendido en el sistema contra lo declarado físicamente por el cajero.
 */
@Service
public class TurnoService {

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Transactional
    public Turno abrirTurno(Long tenantId, String idCajero, BigDecimal montoBase, String moneda) {
        if (montoBase == null || montoBase.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El monto base de apertura no puede ser negativo");
        }
        turnoRepository.findByTenantIdAndMonedaAndEstado(tenantId, moneda, Turno.EstadoTurno.ABIERTO)
            .ifPresent(t -> { throw new RuntimeException("Ya hay un turno abierto en " + moneda + " (desde " + t.getFechaApertura() + ") — ciérralo antes de abrir uno nuevo."); });

        Turno turno = new Turno();
        turno.setTenantId(tenantId);
        turno.setIdCajero(idCajero);
        turno.setMoneda(moneda);
        turno.setMontoBase(montoBase);
        turno.setFechaApertura(LocalDateTime.now());
        turno.setEstado(Turno.EstadoTurno.ABIERTO);
        return turnoRepository.save(turno);
    }

    public Optional<Turno> turnoAbierto(Long tenantId, String moneda) {
        return turnoRepository.findByTenantIdAndMonedaAndEstado(tenantId, moneda, Turno.EstadoTurno.ABIERTO);
    }

    public List<Turno> historial(Long tenantId) {
        return turnoRepository.findByTenantIdOrderByFechaAperturaDesc(tenantId);
    }

    /**
     * Egreso de caja (pago a proveedor, gasto menor) DENTRO de un turno —
     * exige que haya una caja abierta: registrar salidas de dinero sin un
     * turno activo dejaría movimientos huérfanos que ningún Cierre Z podría
     * auditar correctamente.
     */
    @Transactional
    public MovimientoCaja registrarEgreso(Long turnoId, Long tenantId, BigDecimal monto, String concepto) {
        Turno turno = turnoRepository.findById(turnoId)
            .orElseThrow(() -> new RuntimeException("Turno no encontrado"));
        if (!turno.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Turno no pertenece a este tenant");
        }
        if (turno.getEstado() != Turno.EstadoTurno.ABIERTO) {
            throw new RuntimeException("Este turno ya está cerrado — no se pueden registrar más egresos");
        }
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto del egreso debe ser mayor a cero");
        }
        return motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
            monto, turno.getMoneda(), concepto != null && !concepto.isBlank() ? concepto : "Egreso de caja");
    }

    /**
     * Cierre Z: lo esperado en caja es montoBase + ingresos - egresos del
     * turno (no solo el delta de movimientos, como el arqueo ciego viejo) —
     * y se compara contra lo que el cajero declara tener físicamente.
     */
    @Transactional
    public Turno cerrarTurno(Long turnoId, Long tenantId, BigDecimal montoDeclarado) {
        Turno turno = turnoRepository.findById(turnoId)
            .orElseThrow(() -> new RuntimeException("Turno no encontrado"));
        if (!turno.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Turno no pertenece a este tenant");
        }
        if (turno.getEstado() != Turno.EstadoTurno.ABIERTO) {
            throw new RuntimeException("Este turno ya está cerrado");
        }
        if (montoDeclarado == null || montoDeclarado.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Indica el monto declarado (lo contado físicamente en caja)");
        }

        LocalDateTime ahora = LocalDateTime.now();
        BigDecimal ingresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(
            tenantId, turno.getMoneda(), MovimientoCaja.TipoMovimiento.INGRESO, turno.getFechaApertura(), ahora);
        BigDecimal egresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(
            tenantId, turno.getMoneda(), MovimientoCaja.TipoMovimiento.EGRESO, turno.getFechaApertura(), ahora);

        BigDecimal montoEsperado = turno.getMontoBase().add(ingresos).subtract(egresos);
        BigDecimal descuadre = montoDeclarado.subtract(montoEsperado);

        turno.setFechaCierre(ahora);
        turno.setMontoDeclarado(montoDeclarado);
        turno.setMontoEsperado(montoEsperado);
        turno.setDescuadre(descuadre);
        turno.setEstado(Turno.EstadoTurno.CERRADO);
        return turnoRepository.save(turno);
    }
}
