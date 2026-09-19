package com.auroraplus.modules.comercio.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiBudgetServiceTest {

    private JdbcTemplate jdbcTemplate;
    private GeminiBudgetService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        Clock clock = Clock.fixed(Instant.parse("2026-09-19T12:00:00Z"), ZoneOffset.UTC);
        service = new GeminiBudgetService(jdbcTemplate, clock);
        ReflectionTestUtils.setField(service, "presupuestoMensualUsd", new BigDecimal("3.00"));
        ReflectionTestUtils.setField(service, "reservaPorLlamadaUsd", new BigDecimal("0.002"));
        ReflectionTestUtils.setField(service, "precioEntradaMillonUsd", new BigDecimal("0.30"));
        ReflectionTestUtils.setField(service, "precioSalidaMillonUsd", new BigDecimal("2.50"));
    }

    @Test
    void calculaCostoConTarifasDeGemini35FlashLite() {
        assertThat(service.calcularCosto(1_000, 200))
            .isEqualByComparingTo("0.000800000");
    }

    @Test
    void reservaAtomicamenteSinSuperarTresDolaresPorTenantYMes() {
        when(jdbcTemplate.update(anyString(), eq(77L), eq("2026-09"))).thenReturn(1);
        when(jdbcTemplate.update(anyString(),
            eq(new BigDecimal("0.002")), eq(77L), eq("2026-09"),
            eq(new BigDecimal("0.002")), eq(new BigDecimal("3.00"))))
            .thenReturn(1);

        assertThat(service.reservar(77L)).isTrue();

        verify(jdbcTemplate).update(anyString(),
            eq(new BigDecimal("0.002")), eq(77L), eq("2026-09"),
            eq(new BigDecimal("0.002")), eq(new BigDecimal("3.00")));
    }
}
