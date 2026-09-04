package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Gastos operativos del hato (mano de obra, veterinario, mantenimiento de potreros...): salen de caja de inmediato, a diferencia de la compra de animales que genera CXP. */
@Service
public class GanaderiaGastoService {

    @Autowired
    private GastoGanaderiaRepository gastoGanaderiaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Transactional
    public GastoGanaderia registrarGasto(Long tenantId, String categoria, String descripcion, BigDecimal monto, LocalDate fecha) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto del gasto debe ser mayor a cero");
        }
        if (categoria == null || categoria.isBlank()) {
            throw new RuntimeException("La categoría del gasto es obligatoria");
        }

        GastoGanaderia gasto = new GastoGanaderia();
        gasto.setTenantId(tenantId);
        gasto.setCategoria(categoria);
        gasto.setDescripcion(descripcion);
        gasto.setMonto(monto);
        gasto.setFecha(fecha != null ? fecha : LocalDate.now());
        GastoGanaderia guardado = gastoGanaderiaRepository.save(gasto);

        // Un gasto operativo (jornaleros, veterinario, limpieza) es efectivo que sale
        // de caja de inmediato — no es una deuda a proveedor como la compra de animales.
        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
            monto, null, null, "Gasto ganadería [" + categoria + "]: " + descripcion);

        return guardado;
    }
}
