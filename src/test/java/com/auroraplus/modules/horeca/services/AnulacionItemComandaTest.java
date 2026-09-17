package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.controllers.HorecaController;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cubre lo construido en la sesión del RBAC + anulación de ítem: un mesero
 * NO puede anular por su cuenta, un ítem anulado deja de contar en el total
 * y en el KDS, y una vez PAGADA la comanda ya no se puede tocar ítem por
 * ítem (solo anulando la comanda completa). Sin esto, un cambio futuro
 * podría reabrir sin darse cuenta la puerta que motivó todo esto: anular un
 * plato después de cobrarlo en efectivo, sin dejar rastro.
 */
@SpringBootTest
@ActiveProfiles("test")
class AnulacionItemComandaTest {

    @Autowired
    private HorecaService horecaService;

    @Autowired
    private HorecaController horecaController;

    // tenantId único por test (no hay LicenciaTenant para ninguno de estos:
    // MotorFinancieroService.obtenerMonedaBase cae a "USD" por defecto).
    private static final AtomicLong SIGUIENTE_TENANT = new AtomicLong(910_000_000L);
    private long nuevoTenantId() { return SIGUIENTE_TENANT.incrementAndGet(); }

    @AfterEach
    void limpiarContexto() {
        AuthContext.clear();
        TenantContext.clear();
    }

    private Comanda abrirComandaDePrueba(long tenantId) {
        return horecaService.aperturarComanda(tenantId, 1, "Mesero Prueba");
    }

    private ItemComanda agregarItemManual(long tenantId, Long comandaId, String nombre, String monto) {
        return horecaService.agregarItemComanda(comandaId, tenantId, null, null, null,
            nombre, "COCINA", BigDecimal.ONE, new BigDecimal(monto), null, null);
    }

    @Test
    void anularItem_reduceElTotalYQuedaAuditado() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        agregarItemManual(tenantId, comanda.getId(), "Hamburguesa", "8.00");
        ItemComanda papas = agregarItemManual(tenantId, comanda.getId(), "Papas Fritas", "3.00");

        ItemComanda anulado = horecaService.anularItem(papas.getId(), tenantId, "Cliente lo canceló", "cajero1");

        assertEquals(ItemComanda.EstadoItem.ANULADO, anulado.getEstadoItem());
        assertEquals("Cliente lo canceló", anulado.getMotivoAnulacion());
        assertEquals("cajero1", anulado.getUsuarioAnulacion());
        assertNotNull(anulado.getFechaAnulacion());

        Comanda recargada = horecaService.obtenerComanda(comanda.getId());
        assertEquals(0, new BigDecimal("8.00").compareTo(recargada.getTotalConsumo()),
            "El total debe quedar en $8.00 (solo la hamburguesa), no en $11.00");
    }

    @Test
    void anularItem_sinMotivo_selanzaExcepcion() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        ItemComanda item = agregarItemManual(tenantId, comanda.getId(), "Refresco", "2.00");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> horecaService.anularItem(item.getId(), tenantId, "  ", "cajero1"));
        assertTrue(ex.getMessage().toLowerCase().contains("motivo"));
    }

    @Test
    void anularItem_dosVeces_laSegundaLanzaExcepcion() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        ItemComanda item = agregarItemManual(tenantId, comanda.getId(), "Refresco", "2.00");

        horecaService.anularItem(item.getId(), tenantId, "Motivo 1", "cajero1");
        assertThrows(RuntimeException.class,
            () -> horecaService.anularItem(item.getId(), tenantId, "Motivo 2", "cajero1"));
    }

    @Test
    void anularItem_enComandaYaPagada_noPermiteAnulacionIndividual() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        ItemComanda item = agregarItemManual(tenantId, comanda.getId(), "Cafe", "1.50");

        HorecaService.PagoParcialRequest pago = new HorecaService.PagoParcialRequest();
        pago.metodoPago = "EFECTIVO";
        pago.moneda = "USD";
        pago.monto = new BigDecimal("1.50");
        horecaService.cerrarComandaMixto(comanda.getId(), tenantId, List.of(pago), null, null);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> horecaService.anularItem(item.getId(), tenantId, "Ya no quiero", "cajero1"));
        assertTrue(ex.getMessage().contains("ABIERTA"),
            "Una vez pagada, la única vía debe ser anular la comanda completa (con reverso de caja), no el ítem suelto");
    }

    @Test
    void tableroKds_noMuestraItemsAnulados() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        agregarItemManual(tenantId, comanda.getId(), "Pizza", "10.00");
        ItemComanda paraAnular = agregarItemManual(tenantId, comanda.getId(), "Pasta", "9.00");
        horecaService.anularItem(paraAnular.getId(), tenantId, "Se equivocó el mesero", "cajero1");

        List<ItemKdsDTO> tablero = horecaService.obtenerTableroKds(tenantId, "COCINA");
        assertTrue(tablero.stream().noneMatch(i -> i.id.equals(paraAnular.getId())),
            "Un ítem ANULADO no debe pedir preparación en cocina");
        assertTrue(tablero.stream().anyMatch(i -> i.nombrePlato.equals("Pizza")));
        assertTrue(tablero.stream().allMatch(i -> i.numeroMesa != null && i.numeroMesa == 1),
            "El tablero KDS debe traer la mesa de cada plato (antes venía null por el gotcha de LAZY sin JOIN FETCH)");
    }

    @Test
    void anularItemController_meseroNoAutorizado_esRechazado() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        ItemComanda item = agregarItemManual(tenantId, comanda.getId(), "Te", "1.00");

        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set("mesero1", "MESERO");
        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> horecaController.anularItem(item.getId(), "No lo quiso", "mesero1"));
        assertTrue(ex.getMessage().toLowerCase().contains("permiso"),
            "Un MESERO no debe poder anular un ítem por su cuenta");
    }

    @Test
    void anularItemController_cajeroAutorizado_funciona() {
        long tenantId = nuevoTenantId();
        Comanda comanda = abrirComandaDePrueba(tenantId);
        ItemComanda item = agregarItemManual(tenantId, comanda.getId(), "Te", "1.00");

        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set("cajero1", "CAJERO_VENDEDOR");
        assertDoesNotThrow(() -> horecaController.anularItem(item.getId(), "No lo quiso", "cajero1"));
    }
}
