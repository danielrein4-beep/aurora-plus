package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Entradas (compra) y consumo (ración diaria) de insumos de alimentación — mismo patrón de kárdex que el resto del sistema. */
@Service
public class GanaderiaAlimentacionService {

    @Autowired
    private InsumoAlimentacionRepository insumoAlimentacionRepository;

    @Autowired
    private MovimientoInsumoRepository movimientoInsumoRepository;

    @Autowired
    private RegistroConsumoRepository registroConsumoRepository;

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    private static final String MONEDA_GANADERIA = "USD";

    @Transactional
    public InsumoAlimentacion registrarEntrada(Long tenantId, Long insumoId, BigDecimal cantidad, BigDecimal costoTotal, String motivo) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a cero");
        }
        InsumoAlimentacion insumo = insumoAlimentacionRepository.findById(insumoId)
            .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        if (!insumo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Insumo no pertenece a este tenant");
        }

        BigDecimal stockAnterior = insumo.getStockActual();
        BigDecimal stockNuevo = stockAnterior.add(cantidad);
        insumo.setStockActual(stockNuevo);
        if (costoTotal != null && cantidad.compareTo(BigDecimal.ZERO) > 0) {
            insumo.setCostoUnitario(costoTotal.divide(cantidad, 2, java.math.RoundingMode.HALF_UP));
        }
        insumoAlimentacionRepository.save(insumo);

        MovimientoInsumo movimiento = new MovimientoInsumo();
        movimiento.setTenantId(tenantId);
        movimiento.setInsumo(insumo);
        movimiento.setTipo(MovimientoInsumo.TipoMovimiento.ENTRADA);
        movimiento.setCantidad(cantidad);
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(stockNuevo);
        movimiento.setMotivo(motivo != null ? motivo : "Compra de insumo");
        movimientoInsumoRepository.save(movimiento);

        if (costoTotal != null && costoTotal.compareTo(BigDecimal.ZERO) > 0) {
            MovimientoCaja egreso = new MovimientoCaja();
            egreso.setTenantId(tenantId);
            egreso.setTipo(MovimientoCaja.TipoMovimiento.EGRESO);
            egreso.setMonto(costoTotal);
            egreso.setMoneda(MONEDA_GANADERIA);
            egreso.setConcepto("Compra de insumo: " + insumo.getNombre() + " (" + cantidad + " " + insumo.getUnidadMedida() + ")");
            movimientoCajaRepository.save(egreso);
        }

        return insumo;
    }

    @Transactional
    public RegistroConsumo registrarConsumo(Long tenantId, Long insumoId, Long potreroId, LocalDate fecha, BigDecimal cantidad) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a cero");
        }
        InsumoAlimentacion insumo = insumoAlimentacionRepository.findById(insumoId)
            .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        if (!insumo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Insumo no pertenece a este tenant");
        }
        Potrero potrero = potreroRepository.findById(potreroId)
            .orElseThrow(() -> new RuntimeException("Potrero no encontrado"));
        if (!potrero.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
        }
        if (insumo.getStockActual().compareTo(cantidad) < 0) {
            throw new RuntimeException("Stock insuficiente de " + insumo.getNombre() + ": disponible " + insumo.getStockActual());
        }

        BigDecimal stockAnterior = insumo.getStockActual();
        BigDecimal stockNuevo = stockAnterior.subtract(cantidad);
        insumo.setStockActual(stockNuevo);
        insumoAlimentacionRepository.save(insumo);

        MovimientoInsumo movimiento = new MovimientoInsumo();
        movimiento.setTenantId(tenantId);
        movimiento.setInsumo(insumo);
        movimiento.setTipo(MovimientoInsumo.TipoMovimiento.CONSUMO);
        movimiento.setCantidad(cantidad);
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(stockNuevo);
        movimiento.setMotivo("Ración potrero: " + potrero.getNombre());
        movimientoInsumoRepository.save(movimiento);

        RegistroConsumo registro = new RegistroConsumo();
        registro.setTenantId(tenantId);
        registro.setInsumo(insumo);
        registro.setPotrero(potrero);
        registro.setFecha(fecha != null ? fecha : LocalDate.now());
        registro.setCantidad(cantidad);

        return registroConsumoRepository.save(registro);
    }
}
