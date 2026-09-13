package com.auroraplus.core.costeo;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Resumen de un período para UNA vertical — ver docs/finance-contract.md §3.
 *
 * ventasConCostoConocido es el subconjunto de ventasBrutas cuyo costo NO es aproximado (ej. un
 * cargo manual en Horeca sin escandallo asociado tiene costoUnitario null: cuenta en
 * ventasBrutas pero no acá). Se usa para calcular cobertura sin forzar a que cada
 * CosteoProvider reporte 100% o 0% — el número real puede caer en el medio, y ocultarlo
 * sería exactamente el error de nombrar "utilidad neta" a un cálculo incompleto.
 */
public record ResumenVentasCostos(
    BigDecimal ventasBrutas,
    BigDecimal costoVentas,
    BigDecimal gastosOperativos,
    BigDecimal ventasConCostoConocido,
    String moneda
) {

    public static ResumenVentasCostos vacio(String moneda) {
        return new ResumenVentasCostos(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, moneda);
    }

    /** % de ventasBrutas con costo real conocido. 0 (no null/NaN) cuando no hubo ventas en el período. */
    public BigDecimal coberturaPct() {
        if (ventasBrutas == null || ventasBrutas.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;
        return ventasConCostoConocido.divide(ventasBrutas, 6, RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
    }
}
