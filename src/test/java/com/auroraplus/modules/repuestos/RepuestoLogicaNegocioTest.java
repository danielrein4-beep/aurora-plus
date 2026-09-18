package com.auroraplus.modules.repuestos;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.repositories.ClienteRepository;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.repuestos.entities.PresentacionRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.PresentacionRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cobertura de la lógica de NEGOCIO de Repuestos (el backend real de Retail
 * detrás de ComercioApp.tsx) — hasta ahora el módulo tenía CERO tests. Cubre
 * precio Mayorista/Detal por volumen, descuento automático de cliente
 * Mayorista, conversión entre presentaciones fraccionadas, control de stock
 * y bloqueo de ventas duplicadas por reintento (idempotencia).
 */
@SpringBootTest
@ActiveProfiles("test")
class RepuestoLogicaNegocioTest {

    @Autowired private RepuestoConversionService repuestoConversionService;
    @Autowired private RepuestoItemRepository repuestoItemRepository;
    @Autowired private PresentacionRepuestoRepository presentacionRepuestoRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;

    private RepuestoItem crearRepuesto(Long tenantId, String sku, BigDecimal stock, BigDecimal precioDetal,
                                        BigDecimal precioMayorista, BigDecimal cantidadMinimaMayorista) {
        RepuestoItem r = new RepuestoItem();
        r.setTenantId(tenantId);
        r.setCodigoSku(sku);
        r.setDescripcion("Repuesto de prueba " + sku);
        r.setStockActual(stock);
        r.setPrecioVenta(precioDetal);
        r.setPrecioMayorista(precioMayorista);
        r.setCantidadMinimaMayorista(cantidadMinimaMayorista);
        return repuestoItemRepository.save(r);
    }

    private Cliente crearClienteMayorista(Long tenantId, String nombre, BigDecimal descuentoPct) {
        Cliente c = new Cliente();
        c.setTenantId(tenantId);
        c.setNombre(nombre);
        c.setClasificacion(Cliente.Clasificacion.MAYORISTA);
        c.setDescuentoAutomaticoPorcentaje(descuentoPct);
        return clienteRepository.save(c);
    }

    // ─────────────────────────────────────────────────────────────────
    // VENTA POR VOLUMEN: precio Mayorista/Detal automático
    // ─────────────────────────────────────────────────────────────────

    @Test
    void ventaBajoElUmbralCobraPrecioDetal() {
        long tenantId = 98001L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98001", new BigDecimal("100"),
            new BigDecimal("10.00"), new BigDecimal("8.00"), new BigDecimal("20"));

        RepuestoConversionService.ResultadoVenta resultado = repuestoConversionService.venderPorVolumen(r.getId(), tenantId, new BigDecimal("5"));

        assertFalse(resultado.isEsMayorista(), "5 unidades está bajo el mínimo de 20 — debe cobrar Detal");
        assertEquals(0, new BigDecimal("10.00").compareTo(resultado.getPrecioUnitarioAplicado()));
        assertEquals(0, new BigDecimal("50.00").compareTo(resultado.getTotal()));

        RepuestoItem releido = repuestoItemRepository.findById(r.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("95").compareTo(releido.getStockActual()), "El stock debe descontarse exacto");
    }

    @Test
    void ventaEnOSobreElUmbralCobraPrecioMayorista() {
        long tenantId = 98002L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98002", new BigDecimal("100"),
            new BigDecimal("10.00"), new BigDecimal("8.00"), new BigDecimal("20"));

        RepuestoConversionService.ResultadoVenta resultado = repuestoConversionService.venderPorVolumen(r.getId(), tenantId, new BigDecimal("20"));

        assertTrue(resultado.isEsMayorista());
        assertEquals(0, new BigDecimal("8.00").compareTo(resultado.getPrecioUnitarioAplicado()));
        assertEquals(0, new BigDecimal("160.00").compareTo(resultado.getTotal()));
    }

    @Test
    void clienteMayoristaRecibeSuDescuentoAutomaticoSobreElPrecioYaResuelto() {
        long tenantId = 98003L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98003", new BigDecimal("100"),
            new BigDecimal("10.00"), null, null); // sin tarifa mayorista propia del ítem
        Cliente cliente = crearClienteMayorista(tenantId, "Taller El Rápido", new BigDecimal("10")); // 10% de descuento

        RepuestoConversionService.ResultadoVenta resultado = repuestoConversionService.venderPorVolumen(
            r.getId(), tenantId, new BigDecimal("3"), null, null, null, cliente.getId());

        // Precio Detal $10 - 10% = $9.00 por unidad
        assertEquals(0, new BigDecimal("9.00").compareTo(resultado.getPrecioUnitarioAplicado()));
        assertEquals(0, new BigDecimal("27.00").compareTo(resultado.getTotal()));
    }

    @Test
    void noSePuedeVenderMasStockDelDisponible() {
        long tenantId = 98004L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98004", new BigDecimal("5"),
            new BigDecimal("10.00"), null, null);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> repuestoConversionService.venderPorVolumen(r.getId(), tenantId, new BigDecimal("6")));
        assertTrue(ex.getMessage().contains("Stock insuficiente"), "Debe rechazar explícitamente: " + ex.getMessage());

        RepuestoItem releido = repuestoItemRepository.findById(r.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("5").compareTo(releido.getStockActual()), "Una venta rechazada no debe tocar el stock");
    }

    @Test
    void unaVentaReintentadaConLaMismaClaveDeIdempotenciaNoSeDuplica() {
        long tenantId = 98005L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98005", new BigDecimal("100"),
            new BigDecimal("10.00"), null, null);

        repuestoConversionService.venderPorVolumen(r.getId(), tenantId, new BigDecimal("4"), null, null, "clave-98005", null);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> repuestoConversionService.venderPorVolumen(r.getId(), tenantId, new BigDecimal("4"), null, null, "clave-98005", null));
        assertTrue(ex.getMessage().contains("ya fue procesada"), "Debe rechazar el reintento: " + ex.getMessage());

        RepuestoItem releido = repuestoItemRepository.findById(r.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("96").compareTo(releido.getStockActual()), "El stock solo debe descontarse UNA vez, no dos");
    }

    @Test
    void ventaGeneraIngresoRealEnCaja() {
        long tenantId = 98006L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98006", new BigDecimal("100"),
            new BigDecimal("15.00"), null, null);

        repuestoConversionService.venderPorVolumen(r.getId(), tenantId, new BigDecimal("3"));

        BigDecimal ingresos = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.INGRESO);
        assertEquals(0, new BigDecimal("45.00").compareTo(ingresos), "La venta debe reflejarse como ingreso real en caja");
    }

    // ─────────────────────────────────────────────────────────────────
    // PRESENTACIONES FRACCIONADAS (caja/unidad/metro/kilo)
    // ─────────────────────────────────────────────────────────────────

    @Test
    void despacharPorPresentacionConvierteCorrectamenteAUnidadBase() {
        long tenantId = 98007L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98007", new BigDecimal("100"),
            new BigDecimal("1.00"), null, null); // precio detal del ítem no se usa acá
        PresentacionRepuesto caja = repuestoConversionService.registrarPresentacion(
            r.getId(), tenantId, "CAJA", new BigDecimal("12"), new BigDecimal("100.00")); // 1 caja = 12 unidades, $100/caja

        BigDecimal total = repuestoConversionService.despacharPorPresentacion(caja.getId(), tenantId, new BigDecimal("3")); // 3 cajas

        assertEquals(0, new BigDecimal("300.00").compareTo(total), "3 cajas x $100 = $300");

        RepuestoItem releido = repuestoItemRepository.findById(r.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("64").compareTo(releido.getStockActual()), "100 - (3 cajas x 12 unidades) = 64 unidades base");
    }

    @Test
    void noSePuedeDespacharUnaPresentacionSiNoAlcanzaElStockEnUnidadBase() {
        long tenantId = 98008L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98008", new BigDecimal("10"), // solo 10 unidades base
            new BigDecimal("1.00"), null, null);
        PresentacionRepuesto caja = repuestoConversionService.registrarPresentacion(
            r.getId(), tenantId, "CAJA", new BigDecimal("12"), new BigDecimal("100.00")); // 1 caja = 12 unidades

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> repuestoConversionService.despacharPorPresentacion(caja.getId(), tenantId, BigDecimal.ONE)); // 1 caja = 12, pero solo hay 10
        assertTrue(ex.getMessage().contains("Stock insuficiente"), "Debe rechazar: " + ex.getMessage());
    }

    @Test
    void noSePuedeRegistrarUnaPresentacionConFactorDeConversionCeroONegativo() {
        long tenantId = 98009L;
        RepuestoItem r = crearRepuesto(tenantId, "SKU-98009", new BigDecimal("100"),
            new BigDecimal("1.00"), null, null);

        assertThrows(RuntimeException.class,
            () -> repuestoConversionService.registrarPresentacion(r.getId(), tenantId, "CAJA", BigDecimal.ZERO, new BigDecimal("100.00")));
    }
}
