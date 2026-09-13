package com.auroraplus.core.kpi;

import com.auroraplus.core.kpi.dto.EmpresaKpiDTO;
import com.auroraplus.core.kpi.services.EmpresaKpiService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
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

    private static final LocalDate DESDE = LocalDate.of(2026, 1, 1);
    private static final LocalDate HASTA = LocalDate.of(2026, 1, 31);

    @Test
    void periodoSinNingunaVentaNoRevientaYReportaCero() {
        long tenantId = 92001L;

        EmpresaKpiDTO kpi = empresaKpiService.obtenerKpis(tenantId, DESDE, HASTA, null);

        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().ventasBrutas()));
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().costoVentas()));
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().margenBrutoPct()), "0%, no NaN ni excepción, cuando no hubo ventas");
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.consolidado().coberturaPromedioPonderada()));
        assertTrue(kpi.verticalesNoConectadas().containsAll(java.util.List.of("GANADERIA", "REPUESTOS", "MINERIA", "SALUD", "MODA")));
        assertEquals(0L, kpi.trazabilidad().movimientosTotales());
        assertEquals(0, BigDecimal.ZERO.compareTo(kpi.trazabilidad().porcentajeIdentificado()));
    }

    @Test
    void coberturaParcialDeHorecaYAislamientoEntreTenants() {
        long tenantX = 92002L;
        long tenantY = 92003L;

        // Tenant X: un plato con escandallo (costo conocido) + un "Cover" manual sin costo.
        Comanda comandaX = crearComandaPagada(tenantX);
        agregarItem(comandaX, "Pasta Alfredo", new BigDecimal("2"), new BigDecimal("12.00"), new BigDecimal("4.50"));
        agregarItem(comandaX, "Cover", new BigDecimal("1"), new BigDecimal("3.00"), null);

        // Tenant Y: una venta totalmente distinta — no debe mezclarse con X.
        Comanda comandaY = crearComandaPagada(tenantY);
        agregarItem(comandaY, "Torta", new BigDecimal("1"), new BigDecimal("20.00"), new BigDecimal("8.00"));

        EmpresaKpiDTO kpiX = empresaKpiService.obtenerKpis(tenantX, DESDE, HASTA, null);

        // ventasBrutas = 2*12 + 1*3 = 27.00 ; costoVentas = 2*4.50 = 9.00 (el Cover no aporta costo)
        assertEquals(0, new BigDecimal("27.00").compareTo(kpiX.consolidado().ventasBrutas()));
        assertEquals(0, new BigDecimal("9.00").compareTo(kpiX.consolidado().costoVentas()));

        EmpresaKpiDTO.ModuloKpi horecaX = buscarModulo(kpiX, "HORECA");
        // cobertura = ventasConCostoConocido(24.00) / ventasBrutas(27.00) = 88.89%, NUNCA 100%
        assertTrue(horecaX.coberturaPct().compareTo(new BigDecimal("100")) < 0,
            "El Cover sin escandallo no puede contarse como costo conocido — la cobertura de Horeca no debe ser 100%");
        assertTrue(horecaX.coberturaPct().compareTo(BigDecimal.ZERO) > 0);

        EmpresaKpiDTO kpiY = empresaKpiService.obtenerKpis(tenantY, DESDE, HASTA, null);
        assertEquals(0, new BigDecimal("20.00").compareTo(kpiY.consolidado().ventasBrutas()),
            "El KPI del tenant Y no debe incluir nada de las ventas del tenant X");
        EmpresaKpiDTO.ModuloKpi horecaY = buscarModulo(kpiY, "HORECA");
        assertEquals(0, new BigDecimal("100.00").compareTo(horecaY.coberturaPct()), "Todo el consumo de Y tiene costo conocido -> 100%");
    }

    private EmpresaKpiDTO.ModuloKpi buscarModulo(EmpresaKpiDTO kpi, String modulo) {
        return kpi.porModulo().stream().filter(m -> m.modulo().equals(modulo)).findFirst()
            .orElseThrow(() -> new AssertionError(modulo + " no aparece en porModulo"));
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
