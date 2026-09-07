package com.auroraplus.modules.horeca.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Una fila del reporte operativo de tickets — ver ReporteService.buscarTickets. */
public class ReporteTicketDTO {
    public Long comandaId;
    public String numeroTicket; // ej. "COM-142"
    public LocalDateTime fecha; // fecha de cierre (cuándo se pagó de verdad)
    public BigDecimal totalUsd;
    public BigDecimal totalBs; // null si no había tasa BCV registrada para esa fecha
    public String metodoPago;
    public String estado;
    public String canal;
    public Integer numeroMesa;
}
