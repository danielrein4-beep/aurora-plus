package com.auroraplus.core.kpi.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Respuesta de GET /api/empresa/kpis — docs/finance-contract.md §3.2.
 *
 * "resultadoEstimado" (no "utilidadNeta") a propósito y de forma estable: mientras exista
 * al menos una vertical conectada con cobertura menor a 100% (hoy, Horeca — ver
 * HorecaCosteoProvider), ese nombre implicaría más certeza de la que hay. El nombre del
 * campo no cambia dinámicamente según la cobertura del momento (eso rompería a cualquier
 * consumidor de la API) — se documenta como "estimado" siempre, y quien lo lea tiene
 * `coberturaPromedioPonderada` y `porModulo[].coberturaPct` para juzgar cuánto confiar en él.
 */
public record EmpresaKpiDTO(
    Periodo periodo,
    String moneda,
    Consolidado consolidado,
    List<ModuloKpi> porModulo,
    List<String> verticalesNoConectadas,
    Trazabilidad trazabilidad
) {
    public record Periodo(LocalDate desde, LocalDate hasta) {}

    public record Consolidado(
        BigDecimal ventasBrutas,
        BigDecimal costoVentas,
        BigDecimal margenBruto,
        BigDecimal margenBrutoPct,
        BigDecimal gastosOperativos,
        BigDecimal resultadoEstimado,
        BigDecimal coberturaPromedioPonderada
    ) {}

    public record ModuloKpi(
        String modulo,
        BigDecimal ventasBrutas,
        BigDecimal costoVentas,
        BigDecimal margenBruto,
        BigDecimal coberturaPct
    ) {}

    /** movimientosIdentificados nunca incluye moduloOrigen null ni "MANUAL" — ver §2.2. */
    public record Trazabilidad(
        long movimientosTotales,
        long movimientosIdentificados,
        BigDecimal porcentajeIdentificado
    ) {}
}
