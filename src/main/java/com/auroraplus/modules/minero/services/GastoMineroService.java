package com.auroraplus.modules.minero.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.minero.entities.GastoMinero;
import com.auroraplus.modules.minero.repositories.GastoMineroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Gastos operativos de la mina: salen de caja de inmediato (efectivo), a diferencia de la nómina de destajo que se liquida aparte. */
@Service
public class GastoMineroService {

    @Autowired
    private GastoMineroRepository gastoMineroRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Transactional
    public GastoMinero registrarGasto(Long tenantId, String categoria, String descripcion, BigDecimal monto, LocalDate fecha) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto del gasto debe ser mayor a cero");
        }
        if (categoria == null || categoria.isBlank()) {
            throw new RuntimeException("La categoría del gasto es obligatoria");
        }

        GastoMinero gasto = new GastoMinero();
        gasto.setTenantId(tenantId);
        gasto.setCategoria(categoria);
        gasto.setDescripcion(descripcion);
        gasto.setMonto(monto);
        gasto.setFecha(fecha != null ? fecha : LocalDate.now());
        GastoMinero guardado = gastoMineroRepository.save(gasto);

        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
            monto, null, null, "Gasto minero [" + categoria + "]: " + descripcion);

        return guardado;
    }
}
