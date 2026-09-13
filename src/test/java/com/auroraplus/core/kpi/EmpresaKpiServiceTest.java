package com.auroraplus.core.kpi;

import com.auroraplus.core.kpi.dto.EmpresaKpiDTO;
import com.auroraplus.core.kpi.services.EmpresaKpiService;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import com.auroraplus.modules.retail.entities.ItemVentaRetail;
import com.auroraplus.modules.retail.entities.VentaRetail;
import com.auroraplus.modules.retail.repositories.ItemVentaRetailRepository;
import com.auroraplus.modules.retail.repositories.VentaRetailRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * docs/finance-contract.md §3, §8 — esqueleto probado de Capa 2: cobertura por vertical,
 * aislamiento entre tenants a nivel de KPI consolidado, y períodos sin ninguna venta.
 */
@SpringBootTest
@ActiveProfiles("test")
class EmpresaKpiServiceTest {

    @Autowired
    private EmpresaKpiService empresaKpiService;

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private ItemComandaRepository itemComandaRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private VentaRetailRepository ventaRetailRepository;

    @Autowired
    private ItemVentaRetailRepository itemVentaRetailRepository;

    private static final LocalDate DESDE = LocalDate.of(2026, 1, 1);
    private static final LocalDate HASTA = LocalDate.of(2026, 1, 31);

    @Test
    void periodoSinNingunaVentaNoRevientaYReportaCero() {
        long tenantId = 92001L;

        EmpresaKpiDTO kpi = empresaKpiService.obtenerKpis(tenantId, DESDE, HASTA);

        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().ventasBrutas()));
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().costoVentas()));
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().margenBrutoPct()), "0%, no NaN ni excepción, cuando no hubo ventas");
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().coberturaPromedioPonderada()));
        assertTrue(kpi.verticalesNoConectadas().isEmpty(), "Un tenant sin verticales activas no debe mostrar módulos ajenos");
        assertEquals(0L, kpi.trazabilidad().movimientosTotales());
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.trazabilidad().porcentajeIdentificado()));
    }

    @Test
    void coberturaParcialDeHorecaYAislamientoEntreTenants() {
        long tenantX = 92002L;
        long tenantY = 92003L;
        activarModulo(tenantX, "horeca");
        activarModulo(tenantY, "horeca");

        // Tenant X: un plato con escandallo (costo conocido) + un "Cover" manual sin costo.
        Comanda comandaX = crearComandaPagada(tenantX);
        agregarItem(comandaX, "Pasta Alfredo", new BigDecimal("2"), new BigDecimal("12.00"), new BigDecimal("4.50"));
        agregarItem(comandaX, "Cover", new BigDecimal("1"), new BigDecimal("3.00"), null);

        // Tenant Y: una venta totalmente distinta — no debe mezclarse con X.
        Comanda comandaY = crearComandaPagada(tenantY);
        agregarItem(comandaY, "Torta", new BigDecimal("1"), new BigDecimal("20.00"), new BigDecimal("8.00"));

        EmpresaKpiDTO kpiX = empresaKpiService.obtenerKpis(tenantX, DESDE, HASTA);

        // ventasBrutas = 2*12 + 1*3 = 27.00 ; costoVentas = 2*4.50 = 9.00 (el Cover no aporta costo)
        assertEquals(0, new BigDecimal("27.00").compareTo(kpiX.consolidado().ventasBrutas()));
        assertEquals(0, new BigDecimal("9.00").compareTo(kpiX.consolidado().costoVentas()));

        EmpresaKpiDTO.ModuloKpi horecaX = buscarModulo(kpiX, "HORECA");
        // cobertura = ventasConCostoConocido(24.00) / ventasBrutas(27.00) = 88.89%, NUNCA 100%
        assertTrue(horecaX.coberturaPct().compareTo(new BigDecimal("100")) < 0,
            "El Cover sin escandallo no puede contarse como costo conocido — la cobertura de Horeca no debe ser 100%");
        assertTrue(horecaX.coberturaPct().compareTo(BigDecimal.ZERO) > 0);

        EmpresaKpiDTO kpiY = empresaKpiService.obtenerKpis(tenantY, DESDE, HASTA);
        assertEquals(0, new BigDecimal("20.00").compareTo(kpiY.consolidado().ventasBrutas()),
            "El KPI del tenant Y no debe incluir nada de las ventas del tenant X");
        EmpresaKpiDTO.ModuloKpi horecaY = buscarModulo(kpiY, "HORECA");
        assertEquals(0, new BigDecimal("100.00").compareTo(horecaY.coberturaPct()), "Todo el consumo de Y tiene costo conocido -> 100%");
    }

    @Test
    void retailRespetaModuloActivoYAislaElLimiteSuperiorDelPeriodo() {
        long tenantId = 92004L;
        activarModulo(tenantId, "repuestos");

        agregarVentaRetail(tenantId, LocalDateTime.of(2026, 1, 15, 10, 0),
            new BigDecimal("15.00"), new BigDecimal("6.00"));
        agregarVentaRetail(tenantId, LocalDateTime.of(2026, 2, 1, 0, 0),
            new BigDecimal("99.00"), new BigDecimal("40.00"));

        EmpresaKpiDTO kpi = empresaKpiService.obtenerKpis(tenantId, DESDE, HASTA);
        EmpresaKpiDTO.ModuloKpi retail = buscarModulo(kpi, "RETAIL");
        assertEquals(0, new BigDecimal("15.00").compareTo(retail.ventasBrutas()));
        assertEquals(0, new BigDecimal("6.00").compareTo(retail.costoVentas()));
        assertEquals(0, new BigDecimal("100.00").compareTo(retail.coberturaPct()));
        assertFalse(kpi.verticalesNoConectadas().contains("MODA"));
    }

    @Test
    void ignoraDatosDeUnaVerticalQueElTenantNoTieneActiva() {
        long tenantId = 92005L;
        Comanda comanda = crearComandaPagada(tenantId);
        agregarItem(comanda, "Venta fuera de licencia", BigDecimal.ONE,
            new BigDecimal("50.00"), new BigDecimal("10.00"));

        EmpresaKpiDTO kpi = empresaKpiService.obtenerKpis(tenantId, DESDE, HASTA);
        assertTrue(kpi.porModulo().isEmpty());
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().ventasBrutas()));
    }

    private EmpresaKpiDTO.ModuloKpi buscarModulo(EmpresaKpiDTO kpi, String modulo) {
        return kpi.porModulo().stream().filter(m -> m.modulo().equals(modulo)).findFirst()
            .orElseThrow(() -> new AssertionError(modulo + " no aparece en porModulo"));
    }

    private void activarModulo(long tenantId, String nombre) {
        ModuloTenant modulo = new ModuloTenant();
        modulo.setTenantId(tenantId);
        modulo.setModuloNombre(nombre);
        modulo.setActivo(true);
        moduloTenantRepository.save(modulo);
    }

    private void agregarVentaRetail(long tenantId, LocalDateTime fecha, BigDecimal precio, BigDecimal costo) {
        Articulo articulo = new Articulo();
        articulo.setTenantId(tenantId);
        articulo.setSku("SKU-" + tenantId + "-" + fecha);
        articulo.setNombre("Artículo de prueba");
        articulo.setUnidadMedida("UND");
        articulo.setCategoria("TEST");
        articulo.setPorcentajeImpuesto(BigDecimal.ZERO);
        articulo.setPrecioVenta(precio);
        articulo.setCostoUnitario(costo);
        articulo = articuloRepository.save(articulo);

        VentaRetail venta = new VentaRetail();
        venta.setTenantId(tenantId);
        venta.setTotal(precio);
        venta.setMoneda("USD");
        venta.setEsCredito(false);
        venta.setFechaRegistro(fecha);
        venta = ventaRetailRepository.save(venta);

        ItemVentaRetail item = new ItemVentaRetail();
        item.setTenantId(tenantId);
        item.setVenta(venta);
        item.setArticulo(articulo);
        item.setCantidad(BigDecimal.ONE);
        item.setPrecioUnitario(precio);
        item.setCostoUnitario(costo);
        itemVentaRetailRepository.save(item);
    }

    private Comanda crearComandaPagada(long tenantId) {
        Comanda comanda = new Comanda();
        comanda.setTenantId(tenantId);
        comanda.setMesero("Mesero de prueba");
        comanda.setEstado(Comanda.EstadoComanda.PAGADA);
        comanda.setTotalConsumo(BigDecimal.ZERO);
        comanda.setFechaApertura(LocalDateTime.of(2026, 1, 15, 12, 0));
        comanda.setFechaCierre(LocalDateTime.of(2026, 1, 15, 13, 0));
        return comandaRepository.save(comanda);
    }

    private void agregarItem(Comanda comanda, String nombrePlato, BigDecimal cantidad, BigDecimal precioUnitario, BigDecimal costoUnitario) {
        ItemComanda item = new ItemComanda();
        item.setTenantId(comanda.getTenantId());
        item.setComanda(comanda);
        item.setNombrePlato(nombrePlato);
        item.setEstacionCocina("COCINA");
        item.setEstadoItem(ItemComanda.EstadoItem.ENTREGADO);
        item.setCantidad(cantidad);
        item.setPrecioUnitario(precioUnitario);
        item.setCostoUnitario(costoUnitario);
        itemComandaRepository.save(item);
    }
}
