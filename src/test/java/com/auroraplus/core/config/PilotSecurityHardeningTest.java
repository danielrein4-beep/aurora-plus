package com.auroraplus.core.config;

import com.auroraplus.core.inventario.controllers.ArticuloController;
import com.auroraplus.core.inventario.controllers.InventarioKpiController;
import com.auroraplus.core.inventario.dto.InventarioKpiDTO;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.modules.horeca.controllers.ReporteController;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.services.ReporteTicketDTO;
import com.auroraplus.modules.horeca.services.SimulacionHorecaPilotoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.bind.annotation.RequestParam;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Hardening de seguridad pre-piloto (docs de la revisión sobre 9caf00c) — cubre exactamente:
 * (1) ReporteController, ArticuloController, InventarioKpiController con tenant SOLO desde
 * TenantContext, nunca de query/body; (2) aislamiento real entre tenants en esos endpoints;
 * (3) SimulacionHorecaPilotoService no puede correr sin la condición explícita de ambiente
 * seguro. Esta clase corre con la configuración de test por defecto
 * (app.simulacion-piloto.habilitada NO está seteada -> false), así que también sirve para
 * probar el caso "simulación rechazada por ambiente no habilitado".
 */
@SpringBootTest
@ActiveProfiles("test")
class PilotSecurityHardeningTest {

    @Autowired private ArticuloController articuloController;
    @Autowired private InventarioKpiController inventarioKpiController;
    @Autowired private ReporteController reporteController;
    @Autowired private ComandaRepository comandaRepository;
    @Autowired private SimulacionHorecaPilotoService simulacionHorecaPilotoService;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
    }

    // ── Punto 1: ningún endpoint nombrado acepta tenantId por parámetro ─────────────────────
    // Regresión estructural: si alguien reintroduce "@RequestParam Long tenantId" en cualquiera
    // de estos controllers, esta prueba falla en compilación (el método ya no tendría la misma
    // firma que list) o en runtime (detecta el parámetro por reflexión) — no depende de recordar
    // revisar el diff a mano la próxima vez.

    @Test
    void articuloControllerNoAceptaTenantIdComoParametro() {
        assertNingunMetodoRecibeTenantId(ArticuloController.class);
    }

    @Test
    void inventarioKpiControllerNoAceptaTenantIdComoParametro() {
        assertNingunMetodoRecibeTenantId(InventarioKpiController.class);
    }

    @Test
    void reporteControllerNoAceptaTenantIdComoParametro() {
        assertNingunMetodoRecibeTenantId(ReporteController.class);
    }

    /**
     * No se compara por NOMBRE de parámetro (java.lang.reflect.Parameter.getName() devuelve
     * "arg0", "arg1"... salvo que el proyecto compile con -parameters, que este no hace) — se
     * comparan tipo + anotación, que es justo el patrón real del hallazgo: un parámetro Long
     * anotado @RequestParam. Ningún endpoint legítimo de estos tres controllers necesita hoy un
     * Long por query string (fechas, estado y método de pago no son Long) — si alguna vez
     * apareciera uno legítimo, esta prueba forzaría a revisar conscientemente por qué.
     */
    private void assertNingunMetodoRecibeTenantId(Class<?> controller) {
        for (Method metodo : controller.getDeclaredMethods()) {
            for (Parameter parametro : metodo.getParameters()) {
                boolean esRequestParamLong = parametro.isAnnotationPresent(RequestParam.class) && parametro.getType().equals(Long.class);
                assertFalse(esRequestParamLong, "El método " + metodo.getName() + " de " + controller.getSimpleName()
                    + " recibe un @RequestParam Long — el tenant debe salir exclusivamente de TenantContext, nunca de query/body");
            }
        }
    }

    // ── Punto 2: aislamiento real entre tenants ─────────────────────────────────────────────

    @Test
    void articuloControllerAislaTenants() {
        long tenantA = 95001L;
        long tenantB = 95002L;

        TenantContext.setCurrentTenant(tenantA);
        Articulo articuloDeA = new Articulo();
        articuloDeA.setTenantId(tenantA);
        articuloDeA.setSku("SKU-A-" + System.nanoTime());
        articuloDeA.setNombre("Artículo de A");
        articuloDeA.setUnidadMedida("unidad");
        articuloDeA.setCategoria("General");
        articuloDeA.setPorcentajeImpuesto(BigDecimal.ZERO);
        articuloDeA = articuloControllerGuardarDirecto(articuloDeA);
        Long idArticuloDeA = articuloDeA.getId();

        // Tenant B intenta leer/editar/eliminar/ajustar/entrar/ver-kardex un artículo que
        // pertenece a A, adivinando o reutilizando el id — todo debe rechazarse.
        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> articuloController.obtener(idArticuloDeA));
        assertThrows(RuntimeException.class, () -> {
            var request = new ArticuloController.EditarArticuloRequest();
            request.nombre = "Hackeado";
            articuloController.editar(idArticuloDeA, request);
        });
        assertThrows(RuntimeException.class, () -> {
            var request = new ArticuloController.AjustarStockRequest();
            request.stockReal = new BigDecimal("999");
            articuloController.ajustarStock(idArticuloDeA, request);
        });
        assertThrows(RuntimeException.class, () -> articuloController.eliminar(idArticuloDeA));
        assertThrows(RuntimeException.class, () -> {
            var request = new ArticuloController.EntradaRequest();
            request.cantidad = new BigDecimal("10");
            articuloController.registrarEntrada(idArticuloDeA, request);
        });
        assertThrows(RuntimeException.class, () -> articuloController.kardex(idArticuloDeA));

        // El artículo de A debe seguir intacto — ningún intento de B debe haberlo alterado.
        TenantContext.setCurrentTenant(tenantA);
        Articulo releido = articuloController.obtener(idArticuloDeA);
        assertEquals("Artículo de A", releido.getNombre());
    }

    @Test
    void alertasStockMinimoAislaTenants() {
        long tenantA = 95003L;
        long tenantB = 95004L;

        TenantContext.setCurrentTenant(tenantA);
        Articulo bajoMinimo = new Articulo();
        bajoMinimo.setTenantId(tenantA);
        bajoMinimo.setSku("SKU-BAJO-" + System.nanoTime());
        bajoMinimo.setNombre("Insumo crítico de A");
        bajoMinimo.setUnidadMedida("unidad");
        bajoMinimo.setCategoria("General");
        bajoMinimo.setPorcentajeImpuesto(BigDecimal.ZERO);
        bajoMinimo.setStockActual(new BigDecimal("1"));
        bajoMinimo.setStockMinimo(new BigDecimal("10"));
        articuloControllerGuardarDirecto(bajoMinimo);

        TenantContext.setCurrentTenant(tenantB);
        List<Articulo> alertasDeB = articuloController.alertasStockMinimo();
        assertTrue(alertasDeB.isEmpty(), "El tenant B no debe ver alertas de inventario del tenant A");

        TenantContext.setCurrentTenant(tenantA);
        List<Articulo> alertasDeA = articuloController.alertasStockMinimo();
        assertFalse(alertasDeA.isEmpty(), "El tenant A sí debe ver su propia alerta");
    }

    @Test
    void inventarioKpiControllerAislaTenants() {
        long tenantA = 95005L;
        long tenantB = 95006L;

        TenantContext.setCurrentTenant(tenantA);
        Articulo articuloDeA = new Articulo();
        articuloDeA.setTenantId(tenantA);
        articuloDeA.setSku("SKU-KPI-" + System.nanoTime());
        articuloDeA.setNombre("Artículo valioso de A");
        articuloDeA.setUnidadMedida("unidad");
        articuloDeA.setCategoria("General");
        articuloDeA.setPorcentajeImpuesto(BigDecimal.ZERO);
        articuloDeA.setStockActual(new BigDecimal("100"));
        articuloDeA.setCostoUnitario(new BigDecimal("50"));
        articuloControllerGuardarDirecto(articuloDeA);

        TenantContext.setCurrentTenant(tenantB);
        InventarioKpiDTO kpisDeB = inventarioKpiController.obtenerKpis();
        assertEquals(0, BigDecimal.ZERO.compareTo(kpisDeB.valorBodega()),
            "El valor de bodega del tenant B no debe incluir nada del inventario de A");

        TenantContext.setCurrentTenant(tenantA);
        InventarioKpiDTO kpisDeA = inventarioKpiController.obtenerKpis();
        assertEquals(0, new BigDecimal("5000").compareTo(kpisDeA.valorBodega()), "100 * 50 = 5000 en el inventario propio de A");
    }

    @Test
    void reporteControllerAislaTenants() {
        long tenantA = 95007L;
        long tenantB = 95008L;

        Comanda comandaDeA = new Comanda();
        comandaDeA.setTenantId(tenantA);
        comandaDeA.setMesero("Mesero de A");
        comandaDeA.setEstado(Comanda.EstadoComanda.PAGADA);
        comandaDeA.setTotalConsumo(new BigDecimal("42.00"));
        comandaDeA.setFechaApertura(LocalDateTime.of(2026, 3, 1, 12, 0));
        comandaDeA.setFechaCierre(LocalDateTime.of(2026, 3, 1, 13, 0));
        comandaRepository.save(comandaDeA);

        TenantContext.setCurrentTenant(tenantB);
        ResponseEntity<List<ReporteTicketDTO>> respuestaB = reporteController.tickets(null, null, null, null);
        assertTrue(respuestaB.getBody().isEmpty(), "El tenant B no debe ver tickets del tenant A");

        TenantContext.setCurrentTenant(tenantA);
        ResponseEntity<List<ReporteTicketDTO>> respuestaA = reporteController.tickets(null, null, null, null);
        assertEquals(1, respuestaA.getBody().size(), "El tenant A sí debe ver su propio ticket");
    }

    // ── Punto 3: SimulacionHorecaPilotoService rechazada sin ambiente habilitado ────────────

    @Test
    void simulacionRechazadaCuandoAmbienteNoEstaHabilitado() {
        // app.simulacion-piloto.habilitada NO está seteada en el perfil "test" por defecto -> false.
        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> simulacionHorecaPilotoService.ejecutarSimulacionPiloto(96001L, 1));
        assertTrue(ex.getMessage().contains("deshabilitada"));
    }

    private Articulo articuloControllerGuardarDirecto(Articulo articulo) {
        ResponseEntity<Articulo> respuesta = articuloController.crear(articulo);
        return respuesta.getBody();
    }
}
