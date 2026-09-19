package com.auroraplus.modules.comercio.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.YearMonth;
import java.time.ZoneOffset;

/** Presupuesto mensual atomico por tenant para llamadas comerciales a Gemini. */
@Service
public class GeminiBudgetService {

    private static final BigDecimal UN_MILLON = BigDecimal.valueOf(1_000_000L);

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    @Value("${gemini.comercio.presupuesto-mensual-usd:3.00}")
    private BigDecimal presupuestoMensualUsd;

    @Value("${gemini.comercio.reserva-por-llamada-usd:0.002}")
    private BigDecimal reservaPorLlamadaUsd;

    @Value("${gemini.comercio.precio-entrada-millon-usd:0.30}")
    private BigDecimal precioEntradaMillonUsd;

    @Value("${gemini.comercio.precio-salida-millon-usd:2.50}")
    private BigDecimal precioSalidaMillonUsd;

    public GeminiBudgetService(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, Clock.systemUTC());
    }

    GeminiBudgetService(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    /** Reserva costo antes de llamar a Google. El UPDATE condicional evita sobrepasar el tope aun con concurrencia. */
    public boolean reservar(Long tenantId) {
        String periodo = periodoActual();
        jdbcTemplate.update(
            "INSERT INTO comercio_gemini_consumo_mensual (tenant_id, periodo) VALUES (?, ?) " +
            "ON CONFLICT (tenant_id, periodo) DO NOTHING",
            tenantId, periodo
        );
        return jdbcTemplate.update(
            "UPDATE comercio_gemini_consumo_mensual " +
            "SET costo_usd = costo_usd + ?, llamadas = llamadas + 1, actualizado_en = CURRENT_TIMESTAMP " +
            "WHERE tenant_id = ? AND periodo = ? AND costo_usd + ? <= ?",
            reservaPorLlamadaUsd, tenantId, periodo, reservaPorLlamadaUsd, presupuestoMensualUsd
        ) == 1;
    }

    /** Sustituye la reserva conservadora por el costo real reportado por Gemini. */
    public void conciliar(Long tenantId, long tokensEntrada, long tokensSalida) {
        BigDecimal costoReal = calcularCosto(tokensEntrada, tokensSalida);
        BigDecimal diferencia = costoReal.subtract(reservaPorLlamadaUsd);
        jdbcTemplate.update(
            "UPDATE comercio_gemini_consumo_mensual SET " +
            "tokens_entrada = tokens_entrada + ?, tokens_salida = tokens_salida + ?, " +
            "costo_usd = GREATEST(0, costo_usd + ?), actualizado_en = CURRENT_TIMESTAMP " +
            "WHERE tenant_id = ? AND periodo = ?",
            tokensEntrada, tokensSalida, diferencia, tenantId, periodoActual()
        );
    }

    public void reembolsarReserva(Long tenantId) {
        jdbcTemplate.update(
            "UPDATE comercio_gemini_consumo_mensual SET costo_usd = GREATEST(0, costo_usd - ?), " +
            "llamadas = GREATEST(0, llamadas - 1), actualizado_en = CURRENT_TIMESTAMP " +
            "WHERE tenant_id = ? AND periodo = ?",
            reservaPorLlamadaUsd, tenantId, periodoActual()
        );
    }

    BigDecimal calcularCosto(long tokensEntrada, long tokensSalida) {
        BigDecimal entrada = BigDecimal.valueOf(Math.max(0, tokensEntrada))
            .multiply(precioEntradaMillonUsd).divide(UN_MILLON, 9, RoundingMode.HALF_UP);
        BigDecimal salida = BigDecimal.valueOf(Math.max(0, tokensSalida))
            .multiply(precioSalidaMillonUsd).divide(UN_MILLON, 9, RoundingMode.HALF_UP);
        return entrada.add(salida).setScale(9, RoundingMode.HALF_UP);
    }

    private String periodoActual() {
        return YearMonth.now(clock.withZone(ZoneOffset.UTC)).toString();
    }
}
