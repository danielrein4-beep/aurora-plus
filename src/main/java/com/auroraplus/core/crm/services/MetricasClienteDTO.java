package com.auroraplus.core.crm.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Métricas agregadas de un cliente — calculadas bajo demanda (al abrir su panel), nunca durante el checkout del POS. */
public class MetricasClienteDTO {
    public BigDecimal totalGastado = BigDecimal.ZERO;
    public int cantidadVisitas = 0;
    public LocalDateTime fechaUltimaCompra; // null si nunca compró
}
