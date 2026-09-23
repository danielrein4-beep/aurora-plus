package com.auroraplus.modules.repuestos;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.repuestos.entities.ProveedorRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.ProveedorRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import com.auroraplus.modules.repuestos.services.RepuestoCompraService;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Aislamiento por tenant (P0) para Comercio/Repuestos — el backend real detrás de
 * ComercioApp.tsx no tenía NINGÚN test hasta el piloto de esta semana (Día 1). Con
 * 1-2 negocios distintos compartiendo la misma base de datos en el piloto, esto es
 * el mínimo no negociable: un negocio jamás debe poder leer, vender, cobrar ni pagar
 * sobre el inventario, las cuentas o los movimientos de caja de otro.
 */
@SpringBootTest
@ActiveProfiles("test")
class RepuestoAislamientoTenantP0Test {

    @Autowired private RepuestoConversionService repuestoConversionService;
    @Autowired private RepuestoCompraService repuestoCompraService;
    @Autowired private RepuestoItemRepository repuestoItemRepository;
    @Autowired private ProveedorRepuestoRepository proveedorRepuestoRepository;
    @Autowired private MotorFinancieroService motorFinancieroService;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;

    private RepuestoItem crearRepuesto(Long tenantId, String sku) {
        RepuestoItem r = new RepuestoItem();
        r.setTenantId(tenantId);
        r.setCodigoSku(sku);
        r.setDescripcion("Repuesto de prueba " + sku);
        r.setStockActual(new BigDecimal("50"));
        r.setPrecioVenta(new BigDecimal("10.00"));
        return repuestoItemRepository.save(r);
    }

    @Test
    void tenantBNoPuedeVenderUnRepuestoDelTenantA() {
        long tenantA = 97001L, tenantB = 97002L;
        RepuestoItem repuestoDeA = crearRepuesto(tenantA, "SKU-97001");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> repuestoConversionService.venderPorVolumen(repuestoDeA.getId(), tenantB, new BigDecimal("1")));
        assertTrue(ex.getMessage().contains("Violación de seguridad"), "Debe bloquear: " + ex.getMessage());

        RepuestoItem releido = repuestoItemRepository.findById(repuestoDeA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("50").compareTo(releido.getStockActual()), "El stock del tenant A no debe tocarse");
    }

    @Test
    void tenantBNoPuedeAjustarStockDeUnRepuestoDelTenantA() {
        long tenantA = 97003L, tenantB = 97004L;
        RepuestoItem repuestoDeA = crearRepuesto(tenantA, "SKU-97003");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> repuestoConversionService.ajustarStock(repuestoDeA.getId(), tenantB, new BigDecimal("999"), "intento cruzado"));
        assertTrue(ex.getMessage().contains("Violación de seguridad"), "Debe bloquear: " + ex.getMessage());
    }

    @Test
    void tenantBNoPuedeAbonarUnaCxcOCxpDelTenantA() {
        long tenantA = 97005L, tenantB = 97006L;
        MovimientoCaja cxcDeA = motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantA, MovimientoCaja.TipoMovimiento.CXC, new BigDecimal("100.00"), null, null,
            "Venta a crédito — Cliente: Cliente de A");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> motorFinancieroService.abonarMovimiento(tenantB, cxcDeA.getId(), new BigDecimal("50.00"), "USD"));
        assertTrue(ex.getMessage().contains("no pertenece a este tenant"), "Debe bloquear: " + ex.getMessage());

        MovimientoCaja releido = movimientoCajaRepository.findById(cxcDeA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("100.00").compareTo(releido.getSaldoPendiente()), "El saldo de la CXC de A no debe tocarse");
    }

    @Test
    void listarMovimientosDeUnTenantNuncaDevuelveLosDeOtro() {
        long tenantA = 97007L, tenantB = 97008L;
        motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantA, MovimientoCaja.TipoMovimiento.CXC, new BigDecimal("30.00"), null, null, "CXC exclusiva de A");
        motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantB, MovimientoCaja.TipoMovimiento.CXC, new BigDecimal("77.00"), null, null, "CXC exclusiva de B");

        List<MovimientoCaja> deA = movimientoCajaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantA);
        assertEquals(1, deA.size());
        assertEquals(0, new BigDecimal("30.00").compareTo(deA.get(0).getSaldoPendiente()));
    }

    @Test
    void tenantBNoPuedeRegistrarUnaCompraContraUnProveedorDelTenantA() {
        long tenantA = 97009L, tenantB = 97010L;
        ProveedorRepuesto proveedorSinGuardar = new ProveedorRepuesto();
        proveedorSinGuardar.setTenantId(tenantA);
        proveedorSinGuardar.setNombre("Proveedor de A");
        final ProveedorRepuesto proveedorDeA = proveedorRepuestoRepository.save(proveedorSinGuardar);
        RepuestoItem repuestoDeB = crearRepuesto(tenantB, "SKU-97009");

        RepuestoCompraService.ItemCompra item = new RepuestoCompraService.ItemCompra();
        item.repuestoId = repuestoDeB.getId();
        item.cantidad = new BigDecimal("5");
        item.costoUnitario = new BigDecimal("3.00");

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> repuestoCompraService.registrarCompra(tenantB, proveedorDeA.getId(), "F-001", List.of(item)));
        assertTrue(ex.getMessage().contains("Violación de seguridad") || ex.getMessage().contains("no encontrado"),
            "Debe bloquear: " + ex.getMessage());
    }
}
