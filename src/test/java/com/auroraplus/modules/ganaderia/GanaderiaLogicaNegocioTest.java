package com.auroraplus.modules.ganaderia;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import com.auroraplus.modules.ganaderia.services.GanaderiaCompraService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import com.auroraplus.modules.ganaderia.services.GanaderiaVentaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cobertura de la lógica de NEGOCIO de Ganadería (compra, venta, sanidad) —
 * hasta ahora el único test del módulo era de aislamiento entre tenants
 * (seguridad), no de que los cálculos y reglas de negocio sean correctos.
 */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaLogicaNegocioTest {

    @Autowired private GanaderiaCompraService ganaderiaCompraService;
    @Autowired private GanaderiaVentaService ganaderiaVentaService;
    @Autowired private GanaderiaSanidadService ganaderiaSanidadService;

    @Autowired private AnimalRepository animalRepository;
    @Autowired private ProveedorGanaderiaRepository proveedorGanaderiaRepository;
    @Autowired private CompraAnimalRepository compraAnimalRepository;
    @Autowired private VentaAnimalRepository ventaAnimalRepository;
    @Autowired private VacunaRepository vacunaRepository;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;

    private ProveedorGanaderia crearProveedor(Long tenantId, String nombre) {
        ProveedorGanaderia p = new ProveedorGanaderia();
        p.setTenantId(tenantId);
        p.setNombre(nombre);
        p.setActivo(true);
        return proveedorGanaderiaRepository.save(p);
    }

    private Animal crearAnimalActivo(Long tenantId, String arete) {
        Animal a = new Animal();
        a.setTenantId(tenantId);
        a.setArete(arete);
        a.setNombre("Animal-" + arete);
        a.setEspecie("BOVINO");
        a.setSexo("HEMBRA");
        a.setEstado("ACTIVO");
        return animalRepository.save(a);
    }

    private Vacuna crearVacuna(Long tenantId, String nombre, int diasRetiroCarne) {
        Vacuna v = new Vacuna();
        v.setTenantId(tenantId);
        v.setNombre(nombre);
        v.setEnfermedadPrevenida("Fiebre aftosa");
        v.setDiasRetiroLeche(0);
        v.setDiasRetiroCarne(diasRetiroCarne);
        return vacunaRepository.save(v);
    }

    // ─────────────────────────────────────────────────────────────────
    // COMPRA
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarCompraCreaAnimalesYGeneraCuentaPorPagarConElTotalCorrecto() {
        long tenantId = 9501L;
        ProveedorGanaderia proveedor = crearProveedor(tenantId, "Finca El Progreso");

        GanaderiaCompraService.ItemCompraAnimal item1 = new GanaderiaCompraService.ItemCompraAnimal();
        item1.arete = "ARETE-COMPRA-9501-A";
        item1.especie = "BOVINO";
        item1.sexo = "HEMBRA";
        item1.pesoInicial = new BigDecimal("180.00");
        item1.costo = new BigDecimal("450.00");

        GanaderiaCompraService.ItemCompraAnimal item2 = new GanaderiaCompraService.ItemCompraAnimal();
        item2.arete = "ARETE-COMPRA-9501-B";
        item2.especie = "BOVINO";
        item2.sexo = "MACHO";
        item2.pesoInicial = new BigDecimal("200.00");
        item2.costo = new BigDecimal("500.00");

        CompraAnimal compra = ganaderiaCompraService.registrarCompra(tenantId, proveedor.getId(), "FACT-9501",
            List.of(item1, item2));

        assertEquals(0, new BigDecimal("950.00").compareTo(compra.getTotal()), "El total de la compra debe ser la suma exacta de los ítems");

        Animal a = animalRepository.findByAreteAndTenantId("ARETE-COMPRA-9501-A", tenantId).orElseThrow();
        assertEquals("ACTIVO", a.getEstado(), "Un animal recién comprado debe quedar ACTIVO");
        assertEquals(0, new BigDecimal("450.00").compareTo(a.getCostoAdquisicion()), "El costo de adquisición debe quedar registrado en el animal, no solo en la factura");

        BigDecimal cxpGenerado = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.CXP);
        assertEquals(0, new BigDecimal("950.00").compareTo(cxpGenerado),
            "La compra de animales debe generar una cuenta por pagar (no un egreso inmediato) por el monto exacto");
    }

    @Test
    void noSePuedeComprarDosAnimalesConElMismoArete() {
        long tenantId = 9502L;
        ProveedorGanaderia proveedor = crearProveedor(tenantId, "Finca Duplicados");
        crearAnimalActivo(tenantId, "ARETE-DUP-9502");

        GanaderiaCompraService.ItemCompraAnimal item = new GanaderiaCompraService.ItemCompraAnimal();
        item.arete = "ARETE-DUP-9502"; // ya existe
        item.costo = new BigDecimal("100.00");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> ganaderiaCompraService.registrarCompra(tenantId, proveedor.getId(), "FACT-DUP", List.of(item)));
        assertTrue(ex.getMessage().contains("arete"), "Debe rechazar un arete duplicado explícitamente: " + ex.getMessage());
    }

    @Test
    void noSePuedeComprarConCostoNegativo() {
        long tenantId = 9503L;
        ProveedorGanaderia proveedor = crearProveedor(tenantId, "Finca Costos");

        GanaderiaCompraService.ItemCompraAnimal item = new GanaderiaCompraService.ItemCompraAnimal();
        item.arete = "ARETE-COSTO-NEG-9503";
        item.costo = new BigDecimal("-10.00");

        assertThrows(RuntimeException.class,
            () -> ganaderiaCompraService.registrarCompra(tenantId, proveedor.getId(), "FACT-NEG", List.of(item)));
    }

    // ─────────────────────────────────────────────────────────────────
    // VENTA
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarVentaMarcaAnimalVendidoYGeneraIngresoConElTotalCorrecto() {
        long tenantId = 9504L;
        Animal a1 = crearAnimalActivo(tenantId, "ARETE-VENTA-9504-A");
        Animal a2 = crearAnimalActivo(tenantId, "ARETE-VENTA-9504-B");

        GanaderiaVentaService.ItemVentaAnimal item1 = new GanaderiaVentaService.ItemVentaAnimal();
        item1.animalId = a1.getId();
        item1.precioVenta = new BigDecimal("1200.00");
        GanaderiaVentaService.ItemVentaAnimal item2 = new GanaderiaVentaService.ItemVentaAnimal();
        item2.animalId = a2.getId();
        item2.precioVenta = new BigDecimal("1300.00");

        VentaAnimal venta = ganaderiaVentaService.registrarVenta(tenantId, "TKT-9504", "Comprador Prueba", List.of(item1, item2));

        assertEquals(0, new BigDecimal("2500.00").compareTo(venta.getTotal()));

        Animal releidoA1 = animalRepository.findById(a1.getId()).orElseThrow();
        assertEquals("VENDIDO", releidoA1.getEstado(), "El animal vendido debe quedar marcado VENDIDO");
        assertNull(releidoA1.getPotrero(), "Un animal vendido debe salir del potrero");

        BigDecimal ingresoGenerado = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.INGRESO);
        assertEquals(0, new BigDecimal("2500.00").compareTo(ingresoGenerado),
            "La venta debe generar un ingreso real en caja por el monto exacto vendido");
    }

    @Test
    void noSePuedeVenderUnAnimalQueYaFueVendido() {
        long tenantId = 9505L;
        Animal a = crearAnimalActivo(tenantId, "ARETE-REVENTA-9505");

        GanaderiaVentaService.ItemVentaAnimal item = new GanaderiaVentaService.ItemVentaAnimal();
        item.animalId = a.getId();
        item.precioVenta = new BigDecimal("1000.00");
        ganaderiaVentaService.registrarVenta(tenantId, "TKT-9505-1", "Comprador A", List.of(item));

        GanaderiaVentaService.ItemVentaAnimal item2 = new GanaderiaVentaService.ItemVentaAnimal();
        item2.animalId = a.getId();
        item2.precioVenta = new BigDecimal("1000.00");
        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> ganaderiaVentaService.registrarVenta(tenantId, "TKT-9505-2", "Comprador B", List.of(item2)));
        assertTrue(ex.getMessage().contains("no está activo"), "Debe rechazar la reventa de un animal ya vendido: " + ex.getMessage());
    }

    @Test
    void noSePuedeVenderConPrecioCeroONegativo() {
        long tenantId = 9506L;
        Animal a = crearAnimalActivo(tenantId, "ARETE-PRECIO0-9506");

        GanaderiaVentaService.ItemVentaAnimal item = new GanaderiaVentaService.ItemVentaAnimal();
        item.animalId = a.getId();
        item.precioVenta = BigDecimal.ZERO;

        assertThrows(RuntimeException.class,
            () -> ganaderiaVentaService.registrarVenta(tenantId, "TKT-9506", "Comprador", List.of(item)));

        Animal releido = animalRepository.findById(a.getId()).orElseThrow();
        assertEquals("ACTIVO", releido.getEstado(), "Si la venta se rechaza, el animal no debe quedar tocado");
    }

    // ─────────────────────────────────────────────────────────────────
    // SANIDAD ↔ VENTA: el retiro de carne debe bloquear la venta
    // ─────────────────────────────────────────────────────────────────

    @Test
    void noSePuedeVenderUnAnimalEnPeriodoDeRetiroDeCarne() {
        long tenantId = 9507L;
        Animal a = crearAnimalActivo(tenantId, "ARETE-RETIRO-9507");
        Vacuna vacuna = crearVacuna(tenantId, "Fiebre Aftosa Trivalente", 21); // 21 días de retiro de carne

        ganaderiaSanidadService.aplicarVacuna(tenantId, a.getId(), vacuna.getId(), LocalDate.now(), "LOTE-1", "Dr. Pérez", new BigDecimal("15.00"));

        GanaderiaVentaService.ItemVentaAnimal item = new GanaderiaVentaService.ItemVentaAnimal();
        item.animalId = a.getId();
        item.precioVenta = new BigDecimal("1000.00");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> ganaderiaVentaService.registrarVenta(tenantId, "TKT-RETIRO-9507", "Comprador", List.of(item)));
        assertTrue(ex.getMessage().contains("retiro de carne"), "Debe bloquear la venta explícitamente por retiro sanitario: " + ex.getMessage());

        Animal releido = animalRepository.findById(a.getId()).orElseThrow();
        assertEquals("ACTIVO", releido.getEstado(), "El animal bloqueado por retiro no debe quedar marcado VENDIDO");
    }

    @Test
    void siSePuedeVenderUnAnimalConVacunaSinDiasDeRetiro() {
        long tenantId = 9508L;
        Animal a = crearAnimalActivo(tenantId, "ARETE-SINRETIRO-9508");
        Vacuna vacuna = crearVacuna(tenantId, "Vitaminico", 0); // sin retiro

        // Aplicada hace más de un día: con 0 días de retiro, el retiro ya terminó
        // (el día mismo de la aplicación SÍ cuenta como en retiro — ver GanaderiaSanidadService).
        ganaderiaSanidadService.aplicarVacuna(tenantId, a.getId(), vacuna.getId(), LocalDate.now().minusDays(2), "LOTE-2", "Dr. Pérez", new BigDecimal("5.00"));

        GanaderiaVentaService.ItemVentaAnimal item = new GanaderiaVentaService.ItemVentaAnimal();
        item.animalId = a.getId();
        item.precioVenta = new BigDecimal("1000.00");

        VentaAnimal venta = ganaderiaVentaService.registrarVenta(tenantId, "TKT-SINRETIRO-9508", "Comprador", List.of(item));
        assertEquals(0, new BigDecimal("1000.00").compareTo(venta.getTotal()));

        Animal releido = animalRepository.findById(a.getId()).orElseThrow();
        assertEquals("VENDIDO", releido.getEstado(), "Sin retiro sanitario activo, la venta debe proceder normalmente");
    }

    @Test
    void aplicarVacunaCalculaLasFechasDeFinDeRetiroAPartirDelCatalogo() {
        long tenantId = 9509L;
        Animal a = crearAnimalActivo(tenantId, "ARETE-FECHAS-9509");
        Vacuna vacuna = crearVacuna(tenantId, "Brucelosis", 30);
        vacuna.setDiasRetiroLeche(5);
        vacunaRepository.save(vacuna);

        LocalDate fechaAplicacion = LocalDate.of(2026, 1, 1);
        AplicacionVacuna aplicacion = ganaderiaSanidadService.aplicarVacuna(tenantId, a.getId(), vacuna.getId(), fechaAplicacion, "LOTE-3", "Dr. Pérez", new BigDecimal("20.00"));

        assertEquals(LocalDate.of(2026, 1, 31), aplicacion.getFechaFinRetiroCarne());
        assertEquals(LocalDate.of(2026, 1, 6), aplicacion.getFechaFinRetiroLeche());
    }
}
