package com.auroraplus.core.kpi.services;

import com.auroraplus.core.costeo.CosteoProvider;
import com.auroraplus.core.costeo.ResumenVentasCostos;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.kpi.dto.EmpresaKpiDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * docs/finance-contract.md §3 — agrega lo que cada CosteoProvider conectado ya sabe calcular.
 * No migra ni duplica datos de ninguna vertical: EmpresaKpiService no sabe nada de Comanda,
 * ItemVentaRetail, etc. — eso es responsabilidad exclusiva de cada CosteoProvider.
 */
@Service
public class EmpresaKpiService {

    // Catálogo canónico de verticales (docs/finance-contract.md §1.1). MODA se lista aparte del
    // resto porque no es pública todavía, pero igual se reporta como "no conectada" hasta que
    // tenga suficientes ventas nuevas con costo congelado (ver §3.1) para conectar su proveedor.
    private static final List<String> TODAS_LAS_VERTICALES =
        List.of("GANADERIA", "HORECA", "RETAIL", "REPUESTOS", "MINERIA", "SALUD", "MODA");

    @Autowired
    private List<CosteoProvider> proveedores;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public EmpresaKpiDTO obtenerKpis(Long tenantId, LocalDate desde, LocalDate hasta, String monedaSolicitada) {
        if (desde == null || hasta == null) {
            throw new RuntimeException("Debe indicar 'desde' y 'hasta' — este endpoint no asume un rango por defecto");
        }
        if (hasta.isBefore(desde)) {
            throw new RuntimeException("'hasta' no puede ser anterior a 'desde'");
        }

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        String moneda = (monedaSolicitada != null && !monedaSolicitada.isBlank()) ? monedaSolicitada : monedaBase;

        BigDecimal ventasBrutas = BigDecimal.ZERO;
        BigDecimal costoVentas = BigDecimal.ZERO;
        BigDecimal gastosOperativos = BigDecimal.ZERO;
        BigDecimal ventasConCostoConocido = BigDecimal.ZERO;
        List<EmpresaKpiDTO.ModuloKpi> porModulo = new ArrayList<>();

        for (CosteoProvider proveedor : proveedores) {
            ResumenVentasCostos resumen = proveedor.resumenPeriodo(tenantId, desde, hasta);

            BigDecimal ventasModulo = convertirSiHaceFalta(tenantId, resumen.ventasBrutas(), resumen.moneda(), moneda);
            BigDecimal costoModulo = convertirSiHaceFalta(tenantId, resumen.costoVentas(), resumen.moneda(), moneda);
            BigDecimal gastosModulo = convertirSiHaceFalta(tenantId, resumen.gastosOperativos(), resumen.moneda(), moneda);
            BigDecimal conCostoConocidoModulo = convertirSiHaceFalta(tenantId, resumen.ventasConCostoConocido(), resumen.moneda(), moneda);

            ventasBrutas = ventasBrutas.add(ventasModulo);
            costoVentas = costoVentas.add(costoModulo);
            gastosOperativos = gastosOperativos.add(gastosModulo);
            ventasConCostoConocido = ventasConCostoConocido.add(conCostoConocidoModulo);

            porModulo.add(new EmpresaKpiDTO.ModuloKpi(
                proveedor.moduloId(), ventasModulo, costoModulo, ventasModulo.subtract(costoModulo), resumen.coberturaPct()));
        }

        BigDecimal margenBruto = ventasBrutas.subtract(costoVentas);
        BigDecimal margenBrutoPct = porcentajeSeguro(margenBruto, ventasBrutas);
        BigDecimal resultadoEstimado = margenBruto.subtract(gastosOperativos);
        BigDecimal coberturaPromedioPonderada = porcentajeSeguro(ventasConCostoConocido, ventasBrutas);

        List<String> verticalesNoConectadas = TODAS_LAS_VERTICALES.stream()
            .filter(v -> proveedores.stream().noneMatch(p -> p.moduloId().equals(v)))
            .toList();

        return new EmpresaKpiDTO(
            new EmpresaKpiDTO.Periodo(desde, hasta),
            moneda,
            new EmpresaKpiDTO.Consolidado(ventasBrutas, costoVentas, margenBruto, margenBrutoPct,
                gastosOperativos, resultadoEstimado, coberturaPromedioPonderada),
            porModulo,
            verticalesNoConectadas,
            calcularTrazabilidad(tenantId, desde, hasta)
        );
    }

    private EmpresaKpiDTO.Trazabilidad calcularTrazabilidad(Long tenantId, LocalDate desde, LocalDate hasta) {
        LocalDateTime desdeInicio = desde.atStartOfDay();
        LocalDateTime hastaFin = hasta.plusDays(1).atStartOfDay();

        long total = movimientoCajaRepository.countByTenantIdAndFechaRegistroBetween(tenantId, desdeInicio, hastaFin);
        long identificados = movimientoCajaRepository.contarIdentificadosEntreFechas(tenantId, desdeInicio, hastaFin);
        BigDecimal porcentaje = total > 0
            ? BigDecimal.valueOf(identificados).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return new EmpresaKpiDTO.Trazabilidad(total, identificados, porcentaje);
    }

    // Los ResumenVentasCostos de esta fase (Horeca/Retail) siempre vienen en la moneda base del
    // tenant, así que esto normalmente es un no-op. Si la moneda solicitada difiere, se convierte
    // con la tasa VIGENTE porque es un agregado del período actual, no un movimiento histórico
    // guardado — no viola la regla del §2.1 (esa regla es sobre no reconvertir un
    // montoEquivalenteBase ya congelado en MovimientoCaja con la tasa de hoy).
    private BigDecimal convertirSiHaceFalta(Long tenantId, BigDecimal monto, String monedaOrigen, String monedaDestino) {
        if (monedaOrigen.equals(monedaDestino)) return monto;
        return motorFinancieroService.convertirMoneda(tenantId, monto, monedaOrigen, monedaDestino);
    }

    private BigDecimal porcentajeSeguro(BigDecimal numerador, BigDecimal denominador) {
        if (denominador == null || denominador.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;
        return numerador.divide(denominador, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
    }
}
