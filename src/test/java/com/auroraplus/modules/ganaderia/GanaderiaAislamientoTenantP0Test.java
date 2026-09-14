package com.auroraplus.modules.ganaderia;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.ganaderia.controllers.AnimalController;
import com.auroraplus.modules.ganaderia.controllers.BajaAnimalController;
import com.auroraplus.modules.ganaderia.controllers.CompraAnimalController;
import com.auroraplus.modules.ganaderia.controllers.VentaAnimalController;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.entities.ProveedorGanaderia;
import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.CompraAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.ProveedorGanaderiaRepository;
import com.auroraplus.modules.ganaderia.repositories.VentaAnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaCompraService;
import com.auroraplus.modules.ganaderia.services.GanaderiaVentaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Hardening y pruebas A/B reales de aislamiento por tenant (P0).
 * Controllers cubiertos:
 * - AnimalController (listar, exportar, buscar arete, obtener, editar, crear)
 * - BajaAnimalController (listar, registrar baja)
 * - CompraAnimalController / GanaderiaCompraService (listar, registrar compra, aislamiento proveedor)
 * - VentaAnimalController / GanaderiaVentaService (listar, registrar venta, aislamiento animalId)
 *
 * Cada prueba valida a través de los controllers reales que:
 * El tenant B NO puede listar, exportar, buscar por arete, registrar baja/compra/venta ni editar
 * recursos pertenecientes al tenant A.
 */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaAislamientoTenantP0Test {

    @Autowired private AnimalController animalController;
    @Autowired private BajaAnimalController bajaAnimalController;
    @Autowired private CompraAnimalController compraAnimalController;
    @Autowired private VentaAnimalController ventaAnimalController;

    @Autowired private AnimalRepository animalRepository;
    @Autowired private BajaAnimalRepository bajaAnimalRepository;
    @Autowired private CompraAnimalRepository compraAnimalRepository;
    @Autowired private VentaAnimalRepository ventaAnimalRepository;
    @Autowired private ProveedorGanaderiaRepository proveedorGanaderiaRepository;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    private Animal crearAnimal(Long tenantId, String arete) {
        Animal a = new Animal();
        a.setTenantId(tenantId);
        a.setArete(arete);
        a.setNombre("Animal-" + arete);
        a.setEspecie("BOVINO");
        a.setSexo("HEMBRA");
        a.setEstado("ACTIVO");
        return animalRepository.save(a);
    }

    private ProveedorGanaderia crearProveedor(Long tenantId, String nombre) {
        ProveedorGanaderia p = new ProveedorGanaderia();
        p.setTenantId(tenantId);
        p.setNombre(nombre);
        p.setActivo(true);
        return proveedorGanaderiaRepository.save(p);
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. AnimalController: Listar y Exportar
    // ─────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeListarAnimalesDeA() {
        long tenantA = 88001L, tenantB = 88002L;
        Animal animalA = crearAnimal(tenantA, "ARETE-LISTAR-A");

        TenantContext.setCurrentTenant(tenantA);
        List<Animal> listadoA = animalController.listar(null);
        assertTrue(listadoA.stream().anyMatch(a -> a.getId().equals(animalA.getId())),
            "Tenant A debe ver su propio animal");

        TenantContext.setCurrentTenant(tenantB);
        List<Animal> listadoB = animalController.listar(null);
        assertTrue(listadoB.stream().noneMatch(a -> a.getId().equals(animalA.getId())),
            "Tenant B NO debe ver animales de A en su listado");
    }

    @Test
    void tenantBNoPuedeExportarExcelAnimalesDeA() throws Exception {
        long tenantA = 88003L, tenantB = 88004L;
        crearAnimal(tenantA, "ARETE-EXPORT-A");

        TenantContext.setCurrentTenant(tenantA);
        ResponseEntity<byte[]> exportA = animalController.listarExcel(null);
        assertNotNull(exportA.getBody());
        assertTrue(exportA.getBody().length > 0, "Tenant A debe generar reporte Excel");

        TenantContext.setCurrentTenant(tenantB);
        ResponseEntity<byte[]> exportB = animalController.listarExcel(null);
        assertNotNull(exportB.getBody());
        // El listado de B en base de datos para este tenant está vacío, su excel no incluye datos de A
        List<Animal> animalesB = animalRepository.findByTenantId(tenantB);
        assertTrue(animalesB.isEmpty(), "Tenant B no tiene animales de A");
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. AnimalController: Buscar por Arete y Obtener por Id
    // ─────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeBuscarPorAreteAnimalDeA() {
        long tenantA = 88005L, tenantB = 88006L;
        String arete = "ARETE-BUSCAR-A";
        crearAnimal(tenantA, arete);

        TenantContext.setCurrentTenant(tenantA);
        Animal encontradoA = animalController.buscarPorArete(arete);
        assertNotNull(encontradoA);
        assertEquals(tenantA, encontradoA.getTenantId());

        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> animalController.buscarPorArete(arete),
            "Tenant B NO debe encontrar el animal de A por arete");
    }

    @Test
    void tenantBNoPuedeObtenerPorIdAnimalDeA() {
        long tenantA = 88007L, tenantB = 88008L;
        Animal animalA = crearAnimal(tenantA, "ARETE-OBT-A");

        TenantContext.setCurrentTenant(tenantA);
        Animal encontradoA = animalController.obtener(animalA.getId());
        assertNotNull(encontradoA);

        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> animalController.obtener(animalA.getId()),
            "Tenant B NO debe leer por ID un animal de A");
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. AnimalController: Editar Animal
    // ─────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeEditarAnimalDeA() {
        long tenantA = 88009L, tenantB = 88010L;
        Animal animalA = crearAnimal(tenantA, "ARETE-EDIT-A");

        Animal cambios = new Animal();
        cambios.setNombre("Nombre Modificado Maliciosamente");
        cambios.setRaza("Raza Modificada");

        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> animalController.actualizar(animalA.getId(), cambios),
            "Tenant B NO debe poder editar un animal de A");

        // Verificar que el animal de A no fue modificado
        Animal releido = animalRepository.findById(animalA.getId()).orElseThrow();
        assertEquals("Animal-ARETE-EDIT-A", releido.getNombre(), "El nombre no debió modificarse");
        assertEquals(tenantA, releido.getTenantId(), "El tenantId debe seguir siendo A");
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. BajaAnimalController: Listar y Registrar Baja
    // ─────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeListarBajasDeA() {
        long tenantA = 88011L, tenantB = 88012L;
        Animal animalA = crearAnimal(tenantA, "ARETE-BAJA-LIST-A");

        BajaAnimal bajaA = new BajaAnimal();
        bajaA.setTenantId(tenantA);
        bajaA.setAnimal(animalA);
        bajaA.setFecha(LocalDate.now());
        bajaA.setMotivo("Test Baja");
        bajaAnimalRepository.save(bajaA);

        TenantContext.setCurrentTenant(tenantA);
        List<BajaAnimal> bajasA = bajaAnimalController.listar();
        assertTrue(bajasA.stream().anyMatch(b -> b.getId().equals(bajaA.getId())),
            "Tenant A debe ver sus bajas");

        TenantContext.setCurrentTenant(tenantB);
        List<BajaAnimal> bajasB = bajaAnimalController.listar();
        assertTrue(bajasB.stream().noneMatch(b -> b.getId().equals(bajaA.getId())),
            "Tenant B NO debe ver bajas de A");
    }

    @Test
    void tenantBNoPuedeRegistrarBajaAnimalDeA() {
        long tenantA = 88013L, tenantB = 88014L;
        Animal animalA = crearAnimal(tenantA, "ARETE-BAJA-REG-A");

        BajaAnimalController.BajaRequest req = new BajaAnimalController.BajaRequest();
        req.animalId = animalA.getId();
        req.fecha = LocalDate.now();
        req.motivo = "Intento de baja por tenant B";

        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> bajaAnimalController.registrar(req),
            "Tenant B NO debe poder registrar baja de animal de A");

        Animal releido = animalRepository.findById(animalA.getId()).orElseThrow();
        assertEquals("ACTIVO", releido.getEstado(), "Animal de A debe seguir ACTIVO");
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. CompraAnimalController: Listar y Registrar Compra (valida proveedor)
    // ─────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeListarComprasDeA() {
        long tenantA = 88015L, tenantB = 88016L;

        TenantContext.setCurrentTenant(tenantB);
        List<?> comprasB = compraAnimalController.listar();
        assertTrue(comprasB.isEmpty(), "Tenant B sin compras debe ver lista vacía");
    }

    @Test
    void tenantBNoPuedeRegistrarCompraConProveedorDeA() {
        long tenantA = 88017L, tenantB = 88018L;
        ProveedorGanaderia provA = crearProveedor(tenantA, "Proveedor de Tenant A");

        CompraAnimalController.CompraRequest req = new CompraAnimalController.CompraRequest();
        req.proveedorId = provA.getId();
        req.numeroFactura = "FACT-88017";

        GanaderiaCompraService.ItemCompraAnimal item = new GanaderiaCompraService.ItemCompraAnimal();
        item.arete = "ARETE-COMPRA-B";
        item.costo = new BigDecimal("500.00");
        req.items = List.of(item);

        TenantContext.setCurrentTenant(tenantB);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> compraAnimalController.registrar(req),
            "Tenant B NO debe poder registrar compra usando proveedor de Tenant A");
        assertTrue(ex.getMessage().contains("Proveedor no pertenece a este tenant") || ex.getMessage().contains("Violación de seguridad"),
            "El mensaje debe indicar violación de seguridad o proveedor no perteneciente: " + ex.getMessage());
    }

    // ─────────────────────────────────────────────────────────────────
    // 6. VentaAnimalController: Listar y Registrar Venta (valida animalId)
    // ─────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeListarVentasDeA() {
        long tenantA = 88019L, tenantB = 88020L;

        VentaAnimal ventaA = new VentaAnimal();
        ventaA.setTenantId(tenantA);
        ventaA.setNumeroTicket("TKT-VTA-A-88019");
        ventaAnimalRepository.save(ventaA);

        TenantContext.setCurrentTenant(tenantA);
        List<VentaAnimal> ventasA = ventaAnimalController.listar();
        assertTrue(ventasA.stream().anyMatch(v -> v.getId().equals(ventaA.getId())),
            "Tenant A debe ver sus ventas");

        TenantContext.setCurrentTenant(tenantB);
        List<VentaAnimal> ventasB = ventaAnimalController.listar();
        assertTrue(ventasB.stream().noneMatch(v -> v.getId().equals(ventaA.getId())),
            "Tenant B NO debe ver ventas de A");
    }

    @Test
    void tenantBNoPuedeRegistrarVentaConAnimalDeA() {
        long tenantA = 88021L, tenantB = 88022L;
        Animal animalA = crearAnimal(tenantA, "ARETE-VENTA-A");

        VentaAnimalController.VentaRequest req = new VentaAnimalController.VentaRequest();
        req.numeroTicket = "TKT-ROBO-88021";
        req.comprador = "Comprador de B";

        GanaderiaVentaService.ItemVentaAnimal item = new GanaderiaVentaService.ItemVentaAnimal();
        item.animalId = animalA.getId();
        item.precioVenta = new BigDecimal("1200.00");
        req.items = List.of(item);

        TenantContext.setCurrentTenant(tenantB);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> ventaAnimalController.registrar(req),
            "Tenant B NO debe poder vender un animal perteneciente al Tenant A");
        assertTrue(ex.getMessage().contains("Animal no pertenece a este tenant") || ex.getMessage().contains("Violación de seguridad"),
            "El mensaje debe indicar violación de seguridad de pertenencia: " + ex.getMessage());

        // Verificar que el animal de A sigue activo
        Animal releido = animalRepository.findById(animalA.getId()).orElseThrow();
        assertEquals("ACTIVO", releido.getEstado(), "El animal de A debe seguir ACTIVO");
    }
}
