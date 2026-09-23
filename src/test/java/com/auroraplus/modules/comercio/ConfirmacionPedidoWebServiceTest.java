package com.auroraplus.modules.comercio;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import com.auroraplus.modules.comercio.repositories.PedidoWebComercioRepository;
import com.auroraplus.modules.comercio.services.ConfirmacionPedidoWebService;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Confirmar un pedido web antes solo cambiaba una etiqueta (ver el bug que reemplaza
 * ConfirmacionPedidoWebService) — estos tests fijan el comportamiento correcto: al
 * confirmar, debe descontar inventario real y registrar el ingreso en caja, igual que
 * una venta de mostrador; y debe bloquear casos inseguros (doble confirmación, stock
 * insuficiente, pedido de otro tenant).
 */
@SpringBootTest
@ActiveProfiles("test")
class ConfirmacionPedidoWebServiceTest {

    @Autowired private ConfirmacionPedidoWebService confirmacionPedidoWebService;
    @Autowired private PedidoWebComercioRepository pedidoWebRepository;
    @Autowired private RepuestoItemRepository repuestoItemRepository;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;

    private RepuestoItem crearRepuesto(Long tenantId, String sku, BigDecimal stock, BigDecimal precio) {
        RepuestoItem r = new RepuestoItem();
        r.setTenantId(tenantId);
        r.setCodigoSku(sku);
        r.setDescripcion("Repuesto de prueba " + sku);
        r.setStockActual(stock);
        r.setPrecioVenta(precio);
        return repuestoItemRepository.save(r);
    }

    private PedidoWebComercio crearPedidoPendiente(Long tenantId, String itemsEstructuradosJson, BigDecimal totalUsd) {
        PedidoWebComercio p = new PedidoWebComercio();
        p.setTenantId(tenantId);
        p.setNumeroPedido("PED-TEST-" + System.nanoTime());
        p.setClienteNombre("Cliente Web de Prueba");
        p.setClienteTelefono("04140000000");
        p.setTipoEntrega("PICKUP");
        p.setMetodoPago("PAGO_MOVIL");
        p.setEstado("PENDIENTE");
        p.setTotalUsd(totalUsd);
        p.setTotalBs(BigDecimal.ZERO);
        p.setTasaCambio(BigDecimal.ONE);
        p.setItemsJson("texto de despliegue, no se usa en el test");
        p.setItemsEstructuradosJson(itemsEstructuradosJson);
        p.setFechaCreacion(LocalDateTime.now());
        return pedidoWebRepository.save(p);
    }

    @Test
    void confirmarDescuentaStockYRegistraElIngresoReal() {
        long tenantId = 96001L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-96001", new BigDecimal("20"), new BigDecimal("15.00"));
        PedidoWebComercio pedido = crearPedidoPendiente(tenantId,
            "[{\"productoId\":\"rep-" + r.getId() + "\",\"cantidad\":3,\"nombre\":\"Producto Test\"}]",
            new BigDecimal("45.00"));

        PedidoWebComercio confirmado = confirmacionPedidoWebService.confirmar(tenantId, pedido.getId());

        assertEquals("COMPLETADO", confirmado.getEstado());
        RepuestoItem releido = repuestoItemRepository.findById(r.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("17").compareTo(releido.getStockActual()), "20 - 3 = 17");

        List<MovimientoCaja> movimientos = movimientoCajaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantId);
        assertEquals(1, movimientos.size());
        assertEquals(MovimientoCaja.TipoMovimiento.INGRESO, movimientos.get(0).getTipo());
        assertEquals(0, new BigDecimal("45.00").compareTo(movimientos.get(0).getMonto()), "3 x $15.00 = $45.00");
    }

    @Test
    void noSePuedeConfirmarElMismoPedidoDosVeces() {
        long tenantId = 96002L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-96002", new BigDecimal("20"), new BigDecimal("10.00"));
        PedidoWebComercio pedido = crearPedidoPendiente(tenantId,
            "[{\"productoId\":\"rep-" + r.getId() + "\",\"cantidad\":1,\"nombre\":\"Producto Test\"}]",
            new BigDecimal("10.00"));

        confirmacionPedidoWebService.confirmar(tenantId, pedido.getId());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> confirmacionPedidoWebService.confirmar(tenantId, pedido.getId()));
        assertTrue(ex.getMessage().contains("ya fue procesado"), "Debe bloquear: " + ex.getMessage());

        RepuestoItem releido = repuestoItemRepository.findById(r.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("19").compareTo(releido.getStockActual()), "Solo debe haberse descontado una vez");
    }

    @Test
    void siNoHayStockSuficienteNoConfirmaYNoDejaNadaAMedias() {
        long tenantId = 96003L;
        RepuestoItem barato = crearRepuesto(tenantId, "SKU-96003-A", new BigDecimal("10"), new BigDecimal("5.00"));
        RepuestoItem escaso = crearRepuesto(tenantId, "SKU-96003-B", new BigDecimal("1"), new BigDecimal("8.00"));
        PedidoWebComercio pedido = crearPedidoPendiente(tenantId,
            "[{\"productoId\":\"rep-" + barato.getId() + "\",\"cantidad\":2,\"nombre\":\"Barato\"},"
            + "{\"productoId\":\"rep-" + escaso.getId() + "\",\"cantidad\":5,\"nombre\":\"Escaso\"}]",
            new BigDecimal("50.00"));

        assertThrows(RuntimeException.class, () -> confirmacionPedidoWebService.confirmar(tenantId, pedido.getId()));

        RepuestoItem releido = repuestoItemRepository.findById(barato.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("10").compareTo(releido.getStockActual()),
            "El primer item NO debe quedar descontado si el segundo falla — todo o nada");
        PedidoWebComercio pedidoReleido = pedidoWebRepository.findById(pedido.getId()).orElseThrow();
        assertEquals("PENDIENTE", pedidoReleido.getEstado(), "El pedido debe seguir pendiente, no marcarse completado a medias");
    }

    @Test
    void tenantBNoPuedeConfirmarUnPedidoDelTenantA() {
        long tenantA = 96004L, tenantB = 96005L;
        RepuestoItem r = crearRepuesto(tenantA, "SKU-96004", new BigDecimal("10"), new BigDecimal("10.00"));
        PedidoWebComercio pedidoDeA = crearPedidoPendiente(tenantA,
            "[{\"productoId\":\"rep-" + r.getId() + "\",\"cantidad\":1,\"nombre\":\"Producto de A\"}]",
            new BigDecimal("10.00"));

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> confirmacionPedidoWebService.confirmar(tenantB, pedidoDeA.getId()));
        assertTrue(ex.getMessage().contains("no pertenece a este tenant"), "Debe bloquear: " + ex.getMessage());
    }

    @Test
    void pedidoSinItemsEstructuradosNoSeConfirmaAutomaticamente() {
        long tenantId = 96006L;
        PedidoWebComercio pedido = crearPedidoPendiente(tenantId, null, new BigDecimal("30.00"));

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> confirmacionPedidoWebService.confirmar(tenantId, pedido.getId()));
        assertTrue(ex.getMessage().contains("no tiene artículos vinculados"), "Debe bloquear: " + ex.getMessage());
    }
}
