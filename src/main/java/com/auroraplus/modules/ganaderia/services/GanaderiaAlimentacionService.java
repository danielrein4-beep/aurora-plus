package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
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
    private MotorFinancieroService motorFinancieroService;

    @Transactional
    public InsumoAlimentacion registrarEntrada(Long tenantId, Long insumoId, BigDecimal cantidad, BigDecimal costoTotal, String motivo) {
        return registrarEntrada(tenantId, insumoId, cantidad, costoTotal, null, null, motivo);
    }

    @Transactional
    public InsumoAlimentacion registrarEntrada(Long tenantId, Long insumoId, BigDecimal cantidad, BigDecimal costoTotal,
                                                String monedaPago, BigDecimal montoPagado, String motivo) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a cero");
        }
        if (insumoId == null) throw new IllegalArgumentException("Debe indicar el insumo");
        InsumoAlimentacion insumo = insumoAlimentacionRepository.findForUpdateByIdAndTenantId(insumoId, tenantId)
            .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        BigDecimal stockAnterior = insumo.getStockActual();
        BigDecimal stockNuevo = stockAnterior.add(cantidad);
        insumo.setStockActual(stockNuevo);
        if (costoTotal != null && costoTotal.signum() > 0) {
            // Costo promedio: lo que queda en el depósito a su costo más lo comprado ahora, así una
            // ración de sal vieja no se valora al precio de la última compra.
            BigDecimal existente = stockAnterior.signum() > 0 && insumo.getCostoUnitario() != null
                ? stockAnterior.multiply(insumo.getCostoUnitario()) : BigDecimal.ZERO;
            BigDecimal base = stockAnterior.signum() > 0 ? stockNuevo : cantidad;
            insumo.setCostoUnitario(existente.add(costoTotal).divide(base, 2, java.math.RoundingMode.HALF_UP));
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
            String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
            String monedaFisica = monedaPago == null || monedaPago.isBlank() ? monedaBase : monedaPago.trim().toUpperCase();
            if (!java.util.Set.of("USD", "VES", "COP").contains(monedaFisica)) {
                throw new IllegalArgumentException("Moneda de pago no admitida: " + monedaFisica);
            }
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
                costoTotal, monedaFisica, montoPagado,
                "Compra de alimento: " + insumo.getNombre() + " (" + cantidad + " " + insumo.getUnidadMedida() + ")",
                "GANADERIA", "InsumoAlimentacion", insumo.getId());
        }

        return insumo;
    }

    @Transactional
    public RegistroConsumo registrarConsumo(Long tenantId, Long insumoId, Long potreroId, LocalDate fecha, BigDecimal cantidad) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a cero");
        }
        if (insumoId == null || potreroId == null) {
            throw new IllegalArgumentException("Debe indicar insumo y potrero");
        }
        InsumoAlimentacion insumo = insumoAlimentacionRepository.findForUpdateByIdAndTenantId(insumoId, tenantId)
            .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
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
