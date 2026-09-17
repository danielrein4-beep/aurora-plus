package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Prueba de estrés real (varios tenants, varios hilos concurrentes por
 * tenant) de TODO lo construido en esta sesión sobre HorecaService: agregar
 * ítem, propina, descuento, anular ítem, y cerrar con cobro mixto — todo a
 * la vez, sobre la misma infraestructura compartida (pool de conexiones,
 * EntityManager gestionado por Spring), que es donde una condición de
 * carrera real se manifestaría (no un test secuencial de un solo hilo).
 *
 * Validación de correctitud, no solo "no revienta": al cerrar cada comanda
 * se recalcula a mano cuánto debería sumar (ítems activos, sin los
 * anulados) y se compara exacto contra comanda.getTotalConsumo() — si
 * propina/descuento/anulación tuvieran una condición de carrera que
 * corrompiera el total bajo concurrencia, esto lo atraparía.
 */
@SpringBootTest
@ActiveProfiles("test")
class HorecaFuncionesNuevasStressTest {

    @Autowired
    private HorecaService horecaService;

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    private static final int NUM_TENANTS = 8;
    private static final int HILOS_POR_TENANT = 5;
    private static final int CICLOS_POR_HILO = 6;
    private static final AtomicLong SIGUIENTE_TENANT = new AtomicLong(920_000_000L);

    @Test
    void variosTenantsYHilosConcurrentesConPropinaDescuentoYAnulacion() throws InterruptedException {
        List<Long> tenants = new ArrayList<>();
        for (int t = 0; t < NUM_TENANTS; t++) tenants.add(SIGUIENTE_TENANT.incrementAndGet());

        int totalHilos = NUM_TENANTS * HILOS_POR_TENANT;
        ExecutorService pool = Executors.newFixedThreadPool(totalHilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Void>> futuros = new ArrayList<>();
        CopyOnWriteArrayList<String> errores = new CopyOnWriteArrayList<>();
        AtomicInteger ciclosOk = new AtomicInteger(0);

        long inicio = System.nanoTime();

        for (Long tenantId : tenants) {
            for (int h = 0; h < HILOS_POR_TENANT; h++) {
                final int hiloIdx = h;
                Callable<Void> tarea = () -> {
                    salida.await();
                    for (int ciclo = 0; ciclo < CICLOS_POR_HILO; ciclo++) {
                        try {
                            ejecutarUnCiclo(tenantId, hiloIdx * 1000 + ciclo);
                            ciclosOk.incrementAndGet();
                        } catch (Exception e) {
                            errores.add("tenant=" + tenantId + " hilo=" + hiloIdx + " ciclo=" + ciclo + ": " + e);
                        }
                    }
                    return null;
                };
                futuros.add(pool.submit(tarea));
            }
        }

        salida.countDown(); // todos arrancan a la vez, para maximizar concurrencia real
        for (Future<Void> f : futuros) {
            try {
                f.get(60, TimeUnit.SECONDS);
            } catch (Exception e) {
                errores.add("Future falló: " + e);
            }
        }
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS), "El pool no terminó a tiempo — posible deadlock");

        double segundos = (System.nanoTime() - inicio) / 1_000_000_000.0;
        int totalCiclosEsperados = NUM_TENANTS * HILOS_POR_TENANT * CICLOS_POR_HILO;

        System.out.println("=== PRUEBA DE ESTRÉS HORECA (propina/descuento/anulación) ===");
        System.out.println("Tenants concurrentes:      " + NUM_TENANTS);
        System.out.println("Hilos por tenant:          " + HILOS_POR_TENANT);
        System.out.println("Ciclos por hilo:           " + CICLOS_POR_HILO + " (abrir+3 items+propina+descuento+anular+cobrar)");
        System.out.println("Ciclos completados OK:     " + ciclosOk.get() + " / " + totalCiclosEsperados);
        System.out.println("Errores:                   " + errores.size());
        System.out.println("Tiempo total:              " + String.format("%.2f", segundos) + " s");
        System.out.println("Rendimiento:               " + String.format("%.1f", ciclosOk.get() / segundos) + " ciclos/seg");
        if (!errores.isEmpty()) {
            System.out.println("Primeros errores:");
            errores.stream().limit(10).forEach(System.out::println);
        }

        if (!errores.isEmpty()) fail(errores.size() + " ciclo(s) fallaron bajo concurrencia:\n" + String.join("\n", errores.subList(0, Math.min(10, errores.size()))));
        assertEquals(totalCiclosEsperados, ciclosOk.get(), "Todos los ciclos debían completarse sin excepción");

        // "¿Nada se pierde? ¿Todo se refleja?" — no basta con que cada hilo no haya
        // lanzado excepción: se vuelve a consultar la base de datos DESPUÉS de que
        // todo terminó, por tenant, para confirmar que cada venta realmente quedó
        // registrada como comanda PAGADA y como ingreso real en caja/tesorería —
        // no solo "en memoria" del hilo que la procesó.
        int ciclosPorTenant = HILOS_POR_TENANT * CICLOS_POR_HILO;
        BigDecimal totalEsperadoPorTenant = new BigDecimal("19.60").multiply(BigDecimal.valueOf(ciclosPorTenant));
        int comandasPagadasTotal = 0;
        BigDecimal cajaTotal = BigDecimal.ZERO;
        for (Long tenantId : tenants) {
            List<Comanda> pagadas = comandaRepository.findByTenantIdAndEstadoOrderByFechaAperturaDesc(tenantId, Comanda.EstadoComanda.PAGADA);
            assertEquals(ciclosPorTenant, pagadas.size(),
                "Tenant " + tenantId + ": se esperaban " + ciclosPorTenant + " comandas PAGADAS en la base de datos, hay " + pagadas.size());
            comandasPagadasTotal += pagadas.size();

            BigDecimal ingresosCaja = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.INGRESO);
            assertEquals(0, totalEsperadoPorTenant.compareTo(ingresosCaja),
                "Tenant " + tenantId + ": la caja debía tener $" + totalEsperadoPorTenant + " en ingresos, tiene $" + ingresosCaja);
            cajaTotal = cajaTotal.add(ingresosCaja);
        }

        System.out.println("--- Verificación post-carrera contra la base de datos (no solo memoria) ---");
        System.out.println("Comandas PAGADAS confirmadas en BD:  " + comandasPagadasTotal + " / " + totalCiclosEsperados);
        System.out.println("Total reflejado en caja/tesorería:   $" + cajaTotal + " (esperado: $" + totalEsperadoPorTenant.multiply(BigDecimal.valueOf(NUM_TENANTS)) + ")");
        System.out.println("Nada perdido, nada duplicado: " + (comandasPagadasTotal == totalCiclosEsperados ? "CONFIRMADO" : "FALLÓ"));
    }

    /** Un ciclo completo: abrir mesa, 3 platos, propina 15%, descuento fijo, anular un plato, cobrar exacto, y verificar el total. */
    private void ejecutarUnCiclo(Long tenantId, int numeroMesaUnico) {
        Comanda comanda = horecaService.aperturarComanda(tenantId, numeroMesaUnico, "Mesero-Estres");

        ItemComanda p1 = horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Plato A", "COCINA", BigDecimal.ONE, new BigDecimal("10.00"), null, null);
        horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Plato B", "COCINA", BigDecimal.ONE, new BigDecimal("8.00"), null, null);
        ItemComanda paraAnular = horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Plato C (se anula)", "COCINA", BigDecimal.ONE, new BigDecimal("6.00"), null, null);

        // Subtotal activo en este punto: 10 + 8 + 6 = 24. Propina 15% = 3.60. Descuento fijo = 2.00.
        horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Propina", "CARGOS", BigDecimal.ONE, new BigDecimal("3.60"), null, "15% del consumo");
        horecaService.agregarItemComanda(comanda.getId(), tenantId, null, null, null,
            "Descuento: Prueba de estrés", "CARGOS", BigDecimal.ONE, new BigDecimal("-2.00"), null, "Monto fijo");

        horecaService.anularItem(paraAnular.getId(), tenantId, "Prueba de estrés", "sistema-estres");

        // Total esperado: 10 + 8 (Plato C anulado no cuenta) + 3.60 propina - 2.00 descuento = 19.60
        BigDecimal totalEsperado = new BigDecimal("19.60");

        Comanda antesDeCerrar = horecaService.obtenerComanda(comanda.getId());
        assertEquals(0, totalEsperado.compareTo(antesDeCerrar.getTotalConsumo()),
            "Total mal calculado bajo concurrencia en tenant " + tenantId + " mesa " + numeroMesaUnico
                + ": esperado " + totalEsperado + ", real " + antesDeCerrar.getTotalConsumo());

        HorecaService.PagoParcialRequest pago = new HorecaService.PagoParcialRequest();
        pago.metodoPago = "EFECTIVO";
        pago.moneda = "USD";
        pago.monto = totalEsperado;
        horecaService.cerrarComandaMixto(comanda.getId(), tenantId, List.of(pago), null, null);

        Comanda cerrada = horecaService.obtenerComanda(comanda.getId());
        assertEquals(Comanda.EstadoComanda.PAGADA, cerrada.getEstado());
        assertEquals(0, totalEsperado.setScale(2, RoundingMode.HALF_UP).compareTo(cerrada.getTotalConsumo()));
    }
}
