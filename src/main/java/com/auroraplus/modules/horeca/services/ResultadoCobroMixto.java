package com.auroraplus.modules.horeca.services;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.PagoVenta;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resultado de un cobro (mixto o simple): la comanda ya cerrada, el detalle
 * de cada línea de pago registrada, y el vuelto calculado tanto en la moneda
 * en la que se entrega físicamente como en Bs (VES) para que el cajero pueda
 * anunciarlo en ambas referencias, como se hace en Venezuela con precios en $.
 */
public class ResultadoCobroMixto {
    public Comanda comanda;
    public List<PagoVenta> pagos;
    public BigDecimal totalBase;
    public String monedaBase;
    public BigDecimal totalRecibidoBase;
    public BigDecimal vueltoBase;
    public String monedaVuelto;
    public BigDecimal vueltoEnMonedaVuelto;
    public BigDecimal vueltoVes; // null si no hay tasa BCV registrada — es solo informativo, no bloquea el cobro
}
