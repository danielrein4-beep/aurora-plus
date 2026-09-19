package com.auroraplus.core.kpi;

import com.auroraplus.core.kpi.dto.EmpresaKpiDTO;
import com.auroraplus.core.kpi.services.EmpresaKpiService;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
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
    private RepuestoItemRepository repuestoItemRepository;

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

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
    void repuestosUsaSuKardexYNoFingeCostoHistorico() {
        long tenantId = 92006L;
        activarModulo(tenantId, "repuestos");

        RepuestoItem repuesto = new RepuestoItem();
        repuesto.setTenantId(tenantId);
        repuesto.setCodigoSku("REP-92006");
        repuesto.setDescripcion("Rodamiento de prueba");
        repuesto.setStockActual(new BigDecimal("9"));
        repuesto.setPrecioVenta(new BigDecimal("25.00"));
        repuesto.setCostoUnitario(new BigDecimal("10.00"));
        repuesto = repuestoItemRepository.save(repuesto);

        MovimientoRepuesto venta = new MovimientoRepuesto();
        venta.setTenantId(tenantId);
        venta.setRepuesto(repuesto);
        venta.setTipo(MovimientoRepuesto.TipoMovimiento.VENTA);
        venta.setCantidad(BigDecimal.ONE);
        venta.setStockAnterior(new BigDecimal("10"));
        venta.setStockNuevo(new BigDecimal("9"));
        venta.setMotivo("Venta de prueba");
        venta.setTotal(new BigDecimal("25.00"));
        venta.setFechaRegistro(LocalDateTime.of(2026, 1, 20, 10, 0));
        movimientoRepuestoRepository.save(venta);

        EmpresaKpiDTO kpi = empresaKpiService.obtenerKpis(tenantId, DESDE, HASTA);
        EmpresaKpiDTO.ModuloKpi repuestos = buscarModulo(kpi, "REPUESTOS");
        assertEquals(0, new BigDecimal("25.00").compareTo(repuestos.ventasBrutas()));
        assertEquals(0, BigDecimal.ZERO.compareTo(repuestos.costoVentas()));
        assertEquals(0, BigDecimal.ZERO.compareTo(repuestos.coberturaPct()),
            "No se debe usar el costo actual del catálogo como costo histórico");
        assertTrue(kpi.porModulo().stream().noneMatch(m -> m.modulo().equals("RETAIL")),
            "Repuestos no debe quedar etiquetado como Retail");
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
