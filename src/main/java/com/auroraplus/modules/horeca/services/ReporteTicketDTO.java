package com.auroraplus.modules.horeca.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Una fila del reporte operativo de tickets — ver ReporteService.buscarTickets. */
public class ReporteTicketDTO {
    public Long comandaId;
    public String numeroTicket; // ej. "COM-142"
    public LocalDateTime fecha; // fecha de cierre (cuándo se pagó de verdad)
    public BigDecimal totalUsd;
    public BigDecimal totalBs; // null si no había tasa BCV registrada para esa fecha
    public BigDecimal totalCop; // monto o equivalente en COP
    public String monedaPago; // "USD", "COP", "VES", "MIXTO"
    public BigDecimal montoOriginal; // monto en la moneda en que se cobró físicamente
    public String metodoPago;
    public String estado;
    public String canal;
    public Integer numeroMesa;
    public String mesero;
    // Suma de los renglones "Propina" de la comanda (estacionCocina="CARGOS",
    // ver ComandaDetalle.handleAgregarPropina) — null/0 si no se agregó
    // ninguna. Permite el reporte "Propinas por mesero" sin duplicar el
    // concepto de propina en el backend, ya que hoy es solo un ítem más.
    public BigDecimal propina;

    public BigDecimal totalBase;
    public String monedaBase;
    public String monedaVuelto;
    public BigDecimal vuelto;
    public List<PagoResumen> pagos;

    public static class PagoResumen {
        public String moneda;
        public BigDecimal monto;
        public String metodoPago;
        public BigDecimal equivalenteBase;
        public BigDecimal tasaAplicada;

        public PagoResumen() {}

        public PagoResumen(String moneda, BigDecimal monto, String metodoPago, BigDecimal equivalenteBase, BigDecimal tasaAplicada) {
            this.moneda = moneda;
            this.monto = monto;
            this.metodoPago = metodoPago;
            this.equivalenteBase = equivalenteBase;
            this.tasaAplicada = tasaAplicada;
        }
    }
}
