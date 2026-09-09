package com.auroraplus.modules.salud;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Prueba de estrés con VARIOS TENANTS (clínicas) golpeando el sistema al
 * mismo tiempo, cada uno con varios hilos concurrentes haciendo el flujo
 * completo (paciente -> cita -> consulta -> cobro) repetidamente.
 *
 * Lo que esto valida de verdad — y que un test secuencial NUNCA puede probar
 * — es el hallazgo de seguridad de la auditoría: TenantContext/el filtro de
 * Hibernate se resuelven por request a partir del JWT, pero corren sobre
 * infraestructura compartida (pool de conexiones, EntityManager gestionado
 * por Spring). Si hubiera una fuga de contexto entre requests concurrentes de
 * tenants distintos, aquí es donde aparecería: un paciente de la Clínica 3
 * apareciendo en la lista de la Clínica 7, un cobro con la plata de un tenant
 * cayendo en la caja de otro, etc.
 */
class SaludStressMultiTenantTest extends SaludIntegrationTestBase {

    private static final int NUM_TENANTS = 8;
    private static final int HILOS_POR_TENANT = 5;
    private static final int CICLOS_POR_HILO = 4; // pacientes completos que procesa cada hilo

    @Test
    void variosTenantsConcurrentesNoSeMezclanNiPierdenDatos() throws InterruptedException {
        List<Sesion> clinicas = new ArrayList<>();
        for (int t = 0; t < NUM_TENANTS; t++) {
            clinicas.add(registrarClinica("Clinica Estres " + t + " " + UUID.randomUUID()));
        }

        int totalHilos = NUM_TENANTS * HILOS_POR_TENANT;
        ExecutorService pool = Executors.newFixedThreadPool(totalHilos);
        // Todos los hilos arrancan a la vez (barrera de arranque) para maximizar
        // la concurrencia real entre tenants distintos, en vez de que Java los
        // vaya lanzando en fila.
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Void>> futuros = new ArrayList<>();
        CopyOnWriteArrayList<String> errores = new CopyOnWriteArrayList<>();
        AtomicInteger operacionesOk = new AtomicInteger(0);

        long inicio = System.nanoTime();

        for (int t = 0; t < NUM_TENANTS; t++) {
            final int tenantIdx = t;
            final Sesion clinica = clinicas.get(t);
            for (int h = 0; h < HILOS_POR_TENANT; h++) {
                final int hiloIdx = h;
                Callable<Void> tarea = () -> {
                    salida.await();
                    for (int c = 0; c < CICLOS_POR_HILO; c++) {
                        String tag = "T" + tenantIdx + "-H" + hiloIdx + "-C" + c;
                        try {
                            long pacienteId = registrarPaciente(clinica, "V-" + tag, "Paciente", tag);
                            // Cada hilo usa su propia hora del día (no se solapan entre sí
                            // dentro del mismo tenant/médico); dentro de un hilo, cada ciclo
                            // avanza 15 minutos.
                            java.time.LocalTime horaInicio = java.time.LocalTime.of(7 + hiloIdx, 0).plusMinutes(c * 15L);
                            java.time.LocalTime horaFin = horaInicio.plusMinutes(15);
                            long citaId = agendarCita(clinica, pacienteId, "2026-09-15",
                                horaInicio.toString() + ":00", horaFin.toString() + ":00");
                            long consultaId = registrarConsulta(clinica, pacienteId, citaId);
                            procesarCobro(clinica, pacienteId, consultaId, citaId, "cobro-" + tag, 20.00);
                            operacionesOk.incrementAndGet();
                        } catch (Throwable ex) {
                            errores.add(tag + ": " + ex.getClass().getSimpleName() + " - " + ex.getMessage());
                        }
                    }
                    return null;
                };
                futuros.add(pool.submit(tarea));
            }
        }

        salida.countDown(); // ¡ya! todos los hilos de todos los tenants disparan a la vez
        pool.shutdown();
        boolean terminoATiempo = pool.awaitTermination(120, TimeUnit.SECONDS);
        double segundos = (System.nanoTime() - inicio) / 1_000_000_000.0;

        assertTrue(terminoATiempo, "La carga de estrés no terminó dentro del tiempo límite (120s) — posible deadlock/agotamiento del pool de conexiones");

        for (Future<Void> f : futuros) {
            try {
                f.get();
            } catch (Exception e) {
                fail("Una tarea concurrente lanzó una excepción no controlada: " + e.getCause());
            }
        }

        int totalCiclosEsperados = NUM_TENANTS * HILOS_POR_TENANT * CICLOS_POR_HILO;

        System.out.println("=== REPORTE DE ESTRÉS MULTI-TENANT (Mediclinic) ===");
        System.out.println("Tenants concurrentes:      " + NUM_TENANTS);
        System.out.println("Hilos por tenant:          " + HILOS_POR_TENANT);
        System.out.println("Ciclos completos por hilo: " + CICLOS_POR_HILO + " (paciente+cita+consulta+cobro)");
        System.out.println("Ciclos completados OK:     " + operacionesOk.get() + " / " + totalCiclosEsperados);
        System.out.println("Errores:                   " + errores.size());
        System.out.println("Tiempo total:               " + String.format("%.2f", segundos) + " s");
        System.out.println("Rendimiento:                " + String.format("%.1f", operacionesOk.get() / segundos) + " ciclos/seg");
        errores.forEach(e -> System.out.println("  - " + e));

        assertTrue(errores.isEmpty(), errores.size() + " ciclo(s) fallaron bajo carga concurrente:\n" + String.join("\n", errores));
        assertEquals(totalCiclosEsperados, operacionesOk.get(), "Deben completarse TODOS los ciclos programados, sin perder ninguno bajo concurrencia");

        // --- La verificación que de verdad importa: aislamiento entre tenants bajo carga ---
        int esperadosPorTenant = HILOS_POR_TENANT * CICLOS_POR_HILO;
        for (int t = 0; t < NUM_TENANTS; t++) {
            Sesion clinica = clinicas.get(t);
            ResponseEntity<JsonNode> pacientes = get(clinica, "/api/salud/pacientes");
            JsonNode lista = pacientes.getBody();

            assertEquals(esperadosPorTenant, lista.size(),
                "Tenant " + t + " debería tener exactamente " + esperadosPorTenant
                    + " pacientes propios, tiene " + lista.size()
                    + " — una diferencia aquí significa fuga o pérdida de datos entre tenants concurrentes");

            String prefijoEsperado = "V-T" + t + "-";
            for (JsonNode p : lista) {
                String ident = p.get("identificacion").asText();
                assertTrue(ident.startsWith(prefijoEsperado),
                    "Tenant " + t + " ve un paciente que NO es suyo (identificación " + ident
                        + ") — fuga de datos entre clínicas bajo carga concurrente");
            }

            ResponseEntity<JsonNode> cobrosReporte = get(clinica,
                "/api/salud/cobros/reporte?inicio=2026-01-01T00:00:00&fin=2026-12-31T23:59:59");
            assertEquals(esperadosPorTenant, cobrosReporte.getBody().size(),
                "Tenant " + t + " debería tener exactamente " + esperadosPorTenant + " cobros propios en caja");

            double totalCobradoTenant = 0;
            for (JsonNode c : cobrosReporte.getBody()) {
                totalCobradoTenant += c.get("montoTotal").asDouble();
            }
            assertEquals(esperadosPorTenant * 20.00, totalCobradoTenant, 0.001,
                "La caja del tenant " + t + " no cuadra — posible mezcla de dinero entre clínicas bajo concurrencia");
        }
    }
}
