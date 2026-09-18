package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.PagoVenta;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prueba de ACEPTACIÓN real del cobro mixto multimoneda (USD/VES/COP) —
 * simula de punta a punta exactamente lo que hace un cajero real: abre la
 * mesa, agrega platos, cobra con TRES métodos/monedas distintos a la vez, y
 * se verifica no solo que la comanda cierre, sino que cada línea de pago
 * quede en SU propia moneda en caja (arqueo real), que el vuelto se calcule
 * y se registre como egreso, y que un cobro insuficiente se rechace sin
 * dejar ningún rastro a medias. Hasta ahora solo existían pruebas de estrés
 * (concurrencia con un solo método de pago); esto cubre el escenario real
 * de negociación en Bs/USD/COP que un cajero venezolano hace todos los días.
 */
@SpringBootTest
@ActiveProfiles("test")
class HorecaCobroMixtoAceptacionTest {

    @Autowired private HorecaService horecaService;
    @Autowired private MotorFinancieroService motorFinancieroService;
    @Autowired private ComandaRepository comandaRepository;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;

    private void configurarTasas(Long tenantId, BigDecimal tasaVes, BigDecimal tasaCop) {
        motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", tasaVes, "MANUAL");
        motorFinancieroService.actualizarTasa(tenantId, "USD", "COP", tasaCop, "MANUAL");
    }

    private Comanda abrirComandaConConsumo(Long tenantId, int numeroMesa, BigDecimal precioPlato1, BigDecimal precioPlato2) {
        Comanda comanda = horecaService.aperturarComanda(tenantId, numeroMesa, "Mesero de Prueba");
        horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Plato Principal", "COCINA", BigDecimal.ONE, precioPlato1, null, null);
        horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Bebida", "BARRA", BigDecimal.ONE, precioPlato2, null, null);
        return comandaRepository.findById(comanda.getId()).orElseThrow(); // recargar: agregarItemComanda actualiza el total en BD, no el objeto original en memoria
    }

    @Test
    void cobroMixtoEnTresMonedasSinVueltoQuedaExactoEnCajaPorCadaMoneda() {
        long tenantId = 97701L;
        configurarTasas(tenantId, new BigDecimal("40.00"), new BigDecimal("4000.00"));

        Comanda comanda = abrirComandaConConsumo(tenantId, 1, new BigDecimal("30.00"), new BigDecimal("20.00"));
        assertEquals(0, new BigDecimal("50.00").compareTo(comanda.getTotalConsumo()), "El consumo antes de cobrar debe ser exacto");

        // El cliente paga: $20 efectivo, el equivalente a $20 en Bs por Pago Móvil (transferencia),
        // y el equivalente a $10 en pesos colombianos con tarjeta — total exacto, sin vuelto.
        HorecaService.PagoParcialRequest pagoUsd = new HorecaService.PagoParcialRequest();
        pagoUsd.metodoPago = "EFECTIVO";
        pagoUsd.moneda = "USD";
        pagoUsd.monto = new BigDecimal("20.00");

        HorecaService.PagoParcialRequest pagoVes = new HorecaService.PagoParcialRequest();
        pagoVes.metodoPago = "TRANSFERENCIA";
        pagoVes.moneda = "VES";
        pagoVes.monto = new BigDecimal("800.00"); // 20 USD * 40

        HorecaService.PagoParcialRequest pagoCop = new HorecaService.PagoParcialRequest();
        pagoCop.metodoPago = "TARJETA";
        pagoCop.moneda = "COP";
        pagoCop.monto = new BigDecimal("40000.00"); // 10 USD * 4000

        ResultadoCobroMixto resultado = horecaService.cerrarComandaMixto(comanda.getId(), tenantId,
            List.of(pagoUsd, pagoVes, pagoCop), "USD", "aceptacion-3monedas-" + tenantId);

        assertEquals(Comanda.EstadoComanda.PAGADA, resultado.comanda.getEstado(), "La comanda debe quedar PAGADA tras un cobro que cubre el total");
        assertEquals(0, new BigDecimal("50.00").compareTo(resultado.totalRecibidoBase), "Lo recibido (convertido a la moneda base) debe sumar exacto el total");
        assertEquals(0, BigDecimal.ZERO.compareTo(resultado.vueltoBase), "Un cobro exacto no debe generar vuelto");
        assertEquals(3, resultado.pagos.size(), "Deben quedar registradas las 3 líneas de pago, una por cada moneda entregada");

        for (PagoVenta p : resultado.pagos) {
            switch (p.getMoneda()) {
                case "USD" -> assertEquals(0, new BigDecimal("20.00").compareTo(p.getMontoEquivalenteBase()));
                case "VES" -> assertEquals(0, new BigDecimal("20.00").compareTo(p.getMontoEquivalenteBase()));
                case "COP" -> assertEquals(0, new BigDecimal("10.00").compareTo(p.getMontoEquivalenteBase()));
                default -> fail("Moneda de pago inesperada: " + p.getMoneda());
            }
        }

        // El arqueo de caja real: cada moneda debe verse SEPARADA, no mezclada en una sola cifra.
        BigDecimal ingresosUsd = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.INGRESO);
        BigDecimal ingresosVes = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "VES", MovimientoCaja.TipoMovimiento.INGRESO);
        BigDecimal ingresosCop = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "COP", MovimientoCaja.TipoMovimiento.INGRESO);
        assertEquals(0, new BigDecimal("20.00").compareTo(ingresosUsd), "Caja debe tener exactamente $20 en efectivo real");
        assertEquals(0, new BigDecimal("800.00").compareTo(ingresosVes), "Caja debe tener exactamente Bs 800 reales, no un equivalente inventado");
        assertEquals(0, new BigDecimal("40000.00").compareTo(ingresosCop), "Caja debe tener exactamente COP 40.000 reales");
    }

    @Test
    void cobroConSobrepagoCalculaYRegistraElVueltoEnLaMonedaElegida() {
        long tenantId = 97702L;
        configurarTasas(tenantId, new BigDecimal("40.00"), new BigDecimal("4000.00"));

        Comanda comanda = abrirComandaConConsumo(tenantId, 2, new BigDecimal("18.00"), new BigDecimal("12.00")); // total 30.00

        // El cliente entrega $50 en efectivo — le sobran $20, que pide en bolívares.
        HorecaService.PagoParcialRequest pago = new HorecaService.PagoParcialRequest();
        pago.metodoPago = "EFECTIVO";
        pago.moneda = "USD";
        pago.monto = new BigDecimal("50.00");

        ResultadoCobroMixto resultado = horecaService.cerrarComandaMixto(comanda.getId(), tenantId,
            List.of(pago), "VES", "aceptacion-vuelto-" + tenantId);

        assertEquals(0, new BigDecimal("20.00").compareTo(resultado.vueltoBase), "El vuelto en moneda base debe ser exactamente lo que sobró ($50 - $30)");
        assertEquals("VES", resultado.monedaVuelto);
        assertEquals(0, new BigDecimal("800.00").compareTo(resultado.vueltoEnMonedaVuelto), "El vuelto en Bs debe usar la tasa vigente (20 * 40)");

        BigDecimal egresosVes = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "VES", MovimientoCaja.TipoMovimiento.EGRESO);
        assertEquals(0, new BigDecimal("800.00").compareTo(egresosVes), "El vuelto entregado debe quedar como egreso real en caja, no solo informado en el ticket");
    }

    @Test
    void unCobroQueNoCubreElTotalSeRechazaSinDejarNingunRastro() {
        long tenantId = 97703L;
        configurarTasas(tenantId, new BigDecimal("40.00"), new BigDecimal("4000.00"));

        Comanda comanda = abrirComandaConConsumo(tenantId, 3, new BigDecimal("25.00"), new BigDecimal("25.00")); // total 50.00

        HorecaService.PagoParcialRequest pagoInsuficiente = new HorecaService.PagoParcialRequest();
        pagoInsuficiente.metodoPago = "EFECTIVO";
        pagoInsuficiente.moneda = "USD";
        pagoInsuficiente.monto = new BigDecimal("30.00"); // faltan 20

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> horecaService.cerrarComandaMixto(comanda.getId(), tenantId, List.of(pagoInsuficiente), "USD", "aceptacion-insuficiente-" + tenantId));
        assertTrue(ex.getMessage().contains("no cubre el total"), "Debe rechazar explícitamente un cobro insuficiente: " + ex.getMessage());

        Comanda releida = comandaRepository.findById(comanda.getId()).orElseThrow();
        assertEquals(Comanda.EstadoComanda.ABIERTA, releida.getEstado(), "Un cobro rechazado no debe dejar la comanda cerrada a medias");

        BigDecimal ingresosUsd = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.INGRESO);
        assertEquals(0, BigDecimal.ZERO.compareTo(ingresosUsd), "Un cobro rechazado no debe dejar ningún ingreso a medias en caja (todo o nada, vía @Transactional)");
    }
}
