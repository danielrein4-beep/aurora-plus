package com.auroraplus.core.financiero;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de la Capa 1 del motor financiero (docs/finance-contract.md §2, §5, §8):
 * trazabilidad de origen, aislamiento entre tenants, redondeo/congelamiento de tasa,
 * y concurrencia sobre el mismo mecanismo que va a usar EmpresaKpiService.
 */
@SpringBootTest
@ActiveProfiles("test")
class MovimientoCajaTrazabilidadTest {

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Test
    void guardaYAislaLaTrazabilidadPorTenant() {
        long tenantA = 91001L;
        long tenantB = 91002L;

        MovimientoCaja deA = new MovimientoCaja();
        deA.setTenantId(tenantA);
        deA.setTipo(MovimientoCaja.TipoMovimiento.INGRESO);
        deA.setMonto(new BigDecimal("50.00"));
        deA.setMoneda("USD");
        deA.setConcepto("Venta A");
        deA.setModuloOrigen("HORECA");
        deA.setReferenciaTipo("Comanda");
        deA.setReferenciaId(123L);
        movimientoCajaRepository.save(deA);

        MovimientoCaja deB = new MovimientoCaja();
        deB.setTenantId(tenantB);
        deB.setTipo(MovimientoCaja.TipoMovimiento.INGRESO);
        deB.setMonto(new BigDecimal("999.00"));
        deB.setMoneda("USD");
        deB.setConcepto("Venta B, no debe verse desde A");
        movimientoCajaRepository.save(deB);

        List<MovimientoCaja> deTenantA = movimientoCajaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantA);
        assertEquals(1, deTenantA.size(), "El tenant A no debe ver movimientos de otro tenant");
        MovimientoCaja recuperado = deTenantA.get(0);
        assertEquals("HORECA", recuperado.getModuloOrigen());
        assertEquals("Comanda", recuperado.getReferenciaTipo());
        assertEquals(123L, recuperado.getReferenciaId());
        assertEquals(0, new BigDecimal("50.00").compareTo(recuperado.getMonto()));
    }

    @Test
    void congelaLaTasaAplicadaYNoLaRecalculaConLaTasaDeHoy() {
        long tenantId = 91003L;

        motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", new BigDecimal("40.000000"), "TEST");
        MovimientoCaja movimiento = motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantId, MovimientoCaja.TipoMovimiento.INGRESO, new BigDecimal("100.00"),
            "VES", new BigDecimal("4000.00"), "Venta cobrada en VES");

        assertEquals(6, movimiento.getTasaAplicada().scale(), "tasaAplicada debe guardarse con escala 6");
        assertEquals(2, movimiento.getMontoEquivalenteBase().scale(), "montoEquivalenteBase debe guardarse con escala 2");
        assertEquals(0, new BigDecimal("100.00").compareTo(movimiento.getMontoEquivalenteBase()));
        BigDecimal tasaOriginal = movimiento.getTasaAplicada();

        // La tasa del día sube fuerte (devaluación) DESPUÉS de registrado el movimiento.
        motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", new BigDecimal("80.000000"), "TEST");

        MovimientoCaja releido = movimientoCajaRepository.findById(movimiento.getId()).orElseThrow();
        assertEquals(0, tasaOriginal.compareTo(releido.getTasaAplicada()),
            "Un movimiento ya guardado NUNCA se recalcula con una tasa posterior — docs/finance-contract.md §2.1");
        assertEquals(0, new BigDecimal("100.00").compareTo(releido.getMontoEquivalenteBase()));
    }

    @Test
    void convierteEntreVesYCopUsandoUsdComoPuenteSinExigirUnaTasaInventada() {
        long tenantId = 91005L;
        motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", new BigDecimal("65.500000"), "TEST");
        motorFinancieroService.actualizarTasa(tenantId, "USD", "COP", new BigDecimal("3100.000000"), "TEST");

        BigDecimal enCop = motorFinancieroService.convertirMoneda(
            tenantId, new BigDecimal("2000.00"), "VES", "COP");

        assertEquals(0, new BigDecimal("94656.49").compareTo(enCop),
            "Una compra en Bs debe poder normalizarse a COP con las dos tasas USD ya registradas");
    }

    @Test
    void concurrenciaNoPierdeNiDuplicaMovimientos() throws InterruptedException {
        long tenantId = 91004L;
        int hilos = 20;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);

        for (int i = 0; i < hilos; i++) {
            pool.submit(() -> {
                try {
                    listos.countDown();
                    salida.await(10, TimeUnit.SECONDS);
                    motorFinancieroService.registrarMovimientoMultiMoneda(
                        tenantId, MovimientoCaja.TipoMovimiento.INGRESO, new BigDecimal("10.00"),
                        null, null, "Venta concurrente");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    terminados.countDown();
                }
            });
        }

        listos.await(5, TimeUnit.SECONDS);
        salida.countDown(); // suelta los 20 hilos a la vez
        assertTrue(terminados.await(20, TimeUnit.SECONDS), "Los 20 registros concurrentes no terminaron a tiempo");
        pool.shutdown();

        BigDecimal total = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.INGRESO);
        assertEquals(0, new BigDecimal(hilos * 10).compareTo(total),
            "La suma debe ser exactamente hilos*10 — ninguna escritura concurrente se pudo perder ni duplicar");

        long cantidad = movimientoCajaRepository.findByTenantIdAndTipoOrderByFechaRegistroDesc(
            tenantId, MovimientoCaja.TipoMovimiento.INGRESO).size();
        assertEquals(hilos, cantidad);
    }
}
