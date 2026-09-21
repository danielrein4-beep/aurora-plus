package com.auroraplus.modules.repuestos.services;

import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Utilidad real de Comercio (Repuestos/Ferretería/Retail) — no es lo mismo que "ventas":
 * ventas es el ingreso bruto (lo que ya muestra el POS/Cierre de Caja), utilidad es lo
 * que queda después de descontar el costo real de cada línea vendida. Mismo criterio de
 * RepuestosCosteoProvider (que alimenta el Margen Bruto consolidado de Aurora Finanzas),
 * pero aquí desglosado por producto para que el dueño vea cuáles le dejan más y cuáles
 * casi no dejan margen — Aurora Finanzas solo da el total de todo el negocio.
 */
@Service
public class RepuestosReporteService {

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public UtilidadPeriodoRepuesto obtenerUtilidadPorPeriodo(Long tenantId, LocalDate desde, LocalDate hasta) {
        LocalDateTime desdeInicio = desde.atStartOfDay();
        LocalDateTime hastaFin = hasta.plusDays(1).atStartOfDay();

        List<MovimientoRepuesto> ventas = movimientoRepuestoRepository.findConRepuestoByTenantIdAndTipoAndFecha(
            tenantId, MovimientoRepuesto.TipoMovimiento.VENTA, desdeInicio, hastaFin);

        Map<Long, ResumenUtilidadProductoRepuesto> porProducto = new LinkedHashMap<>();

        for (MovimientoRepuesto m : ventas) {
            if (m.getTotal() == null || m.getRepuesto() == null) continue;

            ResumenUtilidadProductoRepuesto r = porProducto.computeIfAbsent(m.getRepuesto().getId(), id -> {
                ResumenUtilidadProductoRepuesto nuevo = new ResumenUtilidadProductoRepuesto();
                nuevo.repuestoId = id;
                nuevo.codigoSku = m.getRepuesto().getCodigoSku();
                nuevo.descripcion = m.getRepuesto().getDescripcion();
                return nuevo;
            });

            r.cantidadVendida = r.cantidadVendida.add(m.getCantidad() != null ? m.getCantidad() : BigDecimal.ZERO);
            r.ventasBrutas = r.ventasBrutas.add(m.getTotal());

            if (m.getCostoUnitario() != null && m.getCantidad() != null) {
                r.ventasConCostoConocido = r.ventasConCostoConocido.add(m.getTotal());
                r.costoVentas = r.costoVentas.add(m.getCostoUnitario().multiply(m.getCantidad()));
            }
        }

        UtilidadPeriodoRepuesto resultado = new UtilidadPeriodoRepuesto();
        resultado.moneda = motorFinancieroService.obtenerMonedaBase(tenantId);

        for (ResumenUtilidadProductoRepuesto r : porProducto.values()) {
            if (r.ventasConCostoConocido.compareTo(BigDecimal.ZERO) > 0) {
                r.utilidad = r.ventasConCostoConocido.subtract(r.costoVentas).setScale(2, RoundingMode.HALF_UP);
                r.margenPct = r.utilidad.divide(r.ventasConCostoConocido, 6, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
            }
            r.ventasBrutas = r.ventasBrutas.setScale(2, RoundingMode.HALF_UP);
            r.ventasConCostoConocido = r.ventasConCostoConocido.setScale(2, RoundingMode.HALF_UP);
            r.costoVentas = r.costoVentas.setScale(2, RoundingMode.HALF_UP);

            resultado.ventasBrutas = resultado.ventasBrutas.add(r.ventasBrutas);
            resultado.costoVentas = resultado.costoVentas.add(r.costoVentas);
            resultado.utilidad = resultado.utilidad.add(r.utilidad);
        }

        BigDecimal ventasConCostoTotal = porProducto.values().stream()
            .map(r -> r.ventasConCostoConocido).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (ventasConCostoTotal.compareTo(BigDecimal.ZERO) > 0) {
            resultado.margenPct = resultado.utilidad.divide(ventasConCostoTotal, 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
        }
        if (resultado.ventasBrutas.compareTo(BigDecimal.ZERO) > 0) {
            resultado.coberturaPct = ventasConCostoTotal.divide(resultado.ventasBrutas, 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
        }
        resultado.ventasBrutas = resultado.ventasBrutas.setScale(2, RoundingMode.HALF_UP);
        resultado.costoVentas = resultado.costoVentas.setScale(2, RoundingMode.HALF_UP);
        resultado.utilidad = resultado.utilidad.setScale(2, RoundingMode.HALF_UP);

        resultado.productos = porProducto.values().stream()
            .sorted(Comparator.comparing((ResumenUtilidadProductoRepuesto r) -> r.utilidad).reversed())
            .toList();

        return resultado;
    }
}
