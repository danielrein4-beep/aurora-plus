package com.auroraplus.core.kpi.services;

import com.auroraplus.core.costeo.CosteoProvider;
import com.auroraplus.core.costeo.ResumenVentasCostos;
import com.auroraplus.core.config.LicenciaService;
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
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;

/**
 * docs/finance-contract.md §3 — agrega lo que cada CosteoProvider conectado ya sabe calcular.
 * No migra ni duplica datos de ninguna vertical: EmpresaKpiService no sabe nada de Comanda,
 * ItemVentaRetail, etc. — eso es responsabilidad exclusiva de cada CosteoProvider.
 */
@Service
public class EmpresaKpiService {

    private static final Map<String, Set<String>> MODULOS_QUE_HABILITAN_PROVIDER = Map.of(
        "HORECA", Set.of("horeca"),
        "RETAIL", Set.of("retail", "farmacia"),
        // Repuestos tiene sus propias tablas y no puede presentarse como Retail.
        "REPUESTOS", Set.of("repuestos", "ferreteria")
    );

    @Autowired
    private List<CosteoProvider> proveedores;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private LicenciaService licenciaService;

    public EmpresaKpiDTO obtenerKpis(Long tenantId, LocalDate desde, LocalDate hasta) {
        if (desde == null || hasta == null) {
            throw new RuntimeException("Debe indicar 'desde' y 'hasta' — este endpoint no asume un rango por defecto");
        }
        if (hasta.isBefore(desde)) {
            throw new RuntimeException("'hasta' no puede ser anterior a 'desde'");
        }

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        Set<String> modulosActivos = licenciaService.obtenerModulosActivos(tenantId).stream()
            .map(m -> m.toLowerCase(Locale.ROOT))
            .collect(java.util.stream.Collectors.toSet());
        List<CosteoProvider> proveedoresAplicables = proveedores.stream()
            .filter(p -> aplicaAlTenant(p.moduloId(), modulosActivos))
            .toList();

        BigDecimal ventasBrutas = BigDecimal.ZERO;
        BigDecimal costoVentas = BigDecimal.ZERO;
        BigDecimal gastosOperativos = BigDecimal.ZERO;
        BigDecimal ventasConCostoConocido = BigDecimal.ZERO;
        List<EmpresaKpiDTO.ModuloKpi> porModulo = new ArrayList<>();

        for (CosteoProvider proveedor : proveedoresAplicables) {
            ResumenVentasCostos resumen = proveedor.resumenPeriodo(tenantId, desde, hasta);

            if (!monedaBase.equals(resumen.moneda())) {
                throw new IllegalStateException("El proveedor " + proveedor.moduloId()
                    + " devolvió " + resumen.moneda() + " pero la moneda base del tenant es " + monedaBase);
            }
            BigDecimal ventasModulo = resumen.ventasBrutas();
            BigDecimal costoModulo = resumen.costoVentas();
            BigDecimal gastosModulo = resumen.gastosOperativos();
            BigDecimal conCostoConocidoModulo = resumen.ventasConCostoConocido();

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

        Set<String> verticalesActivas = verticalesActivas(modulosActivos);
        List<String> verticalesNoConectadas = verticalesActivas.stream()
            .filter(v -> proveedoresAplicables.stream().noneMatch(p -> p.moduloId().equals(v)))
            .toList();

        return new EmpresaKpiDTO(
            new EmpresaKpiDTO.Periodo(desde, hasta),
            monedaBase,
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

        long total = movimientoCajaRepository.countByTenantIdAndFechaRegistroGreaterThanEqualAndFechaRegistroLessThan(
            tenantId, desdeInicio, hastaFin);
        long identificados = movimientoCajaRepository.contarIdentificadosEntreFechas(
            tenantId, desdeInicio, hastaFin);
        BigDecimal porcentaje = total > 0
            ? BigDecimal.valueOf(identificados).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return new EmpresaKpiDTO.Trazabilidad(total, identificados, porcentaje);
    }

    private boolean aplicaAlTenant(String moduloId, Set<String> modulosActivos) {
        return MODULOS_QUE_HABILITAN_PROVIDER.getOrDefault(moduloId, Set.of()).stream()
            .anyMatch(modulosActivos::contains);
    }

    private Set<String> verticalesActivas(Set<String> modulosActivos) {
        Set<String> resultado = new LinkedHashSet<>();
        if (modulosActivos.contains("ganaderia")) resultado.add("GANADERIA");
        if (modulosActivos.contains("horeca")) resultado.add("HORECA");
        if (modulosActivos.contains("retail") || modulosActivos.contains("farmacia")) {
            resultado.add("RETAIL");
        }
        if (modulosActivos.contains("repuestos") || modulosActivos.contains("ferreteria")) {
            resultado.add("REPUESTOS");
        }
        if (modulosActivos.contains("minero")) resultado.add("MINERIA");
        if (modulosActivos.contains("salud")) resultado.add("SALUD");
        return resultado;
    }

    private BigDecimal porcentajeSeguro(BigDecimal numerador, BigDecimal denominador) {
        if (denominador == null || denominador.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;
        return numerador.divide(denominador, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
    }
}
