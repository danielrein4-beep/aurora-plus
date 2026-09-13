package com.auroraplus.core.personal;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.personal.entities.*;
import com.auroraplus.core.personal.repositories.*;
import com.auroraplus.core.personal.services.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * docs/personal-nomina-contract.md §7 — nómina aprobada inmutable, reverso y ajuste, concurrencia
 * al calcular un período, multimoneda con tasa congelada.
 */
@SpringBootTest
@ActiveProfiles("test")
class MotorNominaTest {

    @Autowired private MotorNominaService motorNominaService;
    @Autowired private PeriodoNominaService periodoNominaService;
    @Autowired private NominaEmpleadoService nominaEmpleadoService;
    @Autowired private AjusteNominaService ajusteNominaService;
    @Autowired private MotorFinancieroService motorFinancieroService;

    @Autowired private ModuloTenantRepository moduloTenantRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PermisoPersonalRepository permisoPersonalRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private AsignacionEmpleadoRepository asignacionEmpleadoRepository;
    @Autowired private PeriodoNominaRepository periodoNominaRepository;
    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
        AuthContext.clear();
    }

    private Long prepararTenantConRolNomina(long tenantId, String username) {
        ModuloTenant modulo = new ModuloTenant();
        modulo.setTenantId(tenantId);
        modulo.setModuloNombre(PersonalAccessService.FLAG_NOMINA_AVANZADA);
        modulo.setActivo(true);
        moduloTenantRepository.save(modulo);

        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set(username, "CAJERO_VENDEDOR");
        Usuario usuario = new Usuario();
        usuario.setTenantId(tenantId);
        usuario.setUsername(username);
        usuario.setPasswordHash("x");
        usuario.setRol(Usuario.Rol.CAJERO_VENDEDOR);
        usuario = usuarioRepository.save(usuario);

        PermisoPersonal permiso = new PermisoPersonal();
        permiso.setTenantId(tenantId);
        permiso.setUsuarioId(usuario.getId());
        permiso.setRol(PermisoPersonal.RolPersonal.NOMINA);
        permisoPersonalRepository.save(permiso);
        return usuario.getId();
    }

    private Empleado crearEmpleadoConAsignacion(long tenantId, String nombre, String moneda, BigDecimal salario) {
        Empleado empleado = new Empleado();
        empleado.setTenantId(tenantId);
        empleado.setNombreCompleto(nombre);
        empleado.setDocumentoIdentidad("V-" + System.nanoTime());
        empleado.setFechaIngreso(LocalDate.of(2025, 1, 1));
        empleado = empleadoRepository.save(empleado);

        AsignacionEmpleado asignacion = new AsignacionEmpleado();
        asignacion.setTenantId(tenantId);
        asignacion.setEmpleadoId(empleado.getId());
        asignacion.setCargoId(1L);
        asignacion.setTipoSalario(AsignacionEmpleado.TipoSalario.FIJO_MENSUAL);
        asignacion.setSalarioPactado(salario);
        asignacion.setMonedaSalario(moneda);
        asignacion.setVigenciaDesde(LocalDate.of(2025, 1, 1));
        asignacionEmpleadoRepository.save(asignacion);
        return empleado;
    }

    private PeriodoNomina crearPeriodo(long tenantId, String moneda) {
        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Quincena de prueba");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda(moneda);
        return periodoNominaRepository.save(periodo);
    }

    @Test
    void calculaSueldoFijoSinAsistenciaAsumeElPeriodoCompleto() {
        long tenantId = 73001L;
        prepararTenantConRolNomina(tenantId, "nomina73001");
        crearEmpleadoConAsignacion(tenantId, "Empleado sin reloj", "USD", new BigDecimal("300.00"));
        PeriodoNomina periodo = crearPeriodo(tenantId, "USD");

        motorNominaService.calcularPeriodo(tenantId, periodo.getId());

        List<NominaEmpleado> nominas = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId());
        assertEquals(1, nominas.size());
        assertEquals(0, new BigDecimal("300.00").compareTo(nominas.get(0).getNetoAPagar()));
    }

    @Test
    void nominaAprobadaEsInmutableSalvoPorAjuste() {
        long tenantId = 73002L;
        prepararTenantConRolNomina(tenantId, "nomina73002");
        crearEmpleadoConAsignacion(tenantId, "Empleado a aprobar", "USD", new BigDecimal("500.00"));
        PeriodoNomina periodo = crearPeriodo(tenantId, "USD");
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());

        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);

        // Mientras está CALCULADA, sí se puede editar directamente.
        nominaEmpleadoService.editarManualmente(tenantId, nomina.getId(), new BigDecimal("510.00"));

        periodoNominaService.aprobar(tenantId, periodo.getId());

        NominaEmpleado aprobada = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nomina.getId()).get();
        assertEquals(NominaEmpleado.Estado.APROBADA, aprobada.getEstado());

        assertThrows(RuntimeException.class,
            () -> nominaEmpleadoService.editarManualmente(tenantId, nomina.getId(), new BigDecimal("999.00")),
            "Una nómina APROBADA no se puede editar directamente");
    }

    @Test
    void reversoYAjuste() {
        long tenantId = 73003L;
        prepararTenantConRolNomina(tenantId, "nomina73003");
        crearEmpleadoConAsignacion(tenantId, "Empleado a reversar", "USD", new BigDecimal("400.00"));
        PeriodoNomina periodo = crearPeriodo(tenantId, "USD");
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);

        periodoNominaService.aprobar(tenantId, periodo.getId());

        // Corrección: registra un bono olvidado SIN tocar el cálculo original congelado.
        AjusteNomina correccion = ajusteNominaService.corregir(tenantId, nomina.getId(), new BigDecimal("25.00"), "Bono de puntualidad olvidado");
        assertEquals(AjusteNomina.Tipo.CORRECCION, correccion.getTipo());
        NominaEmpleado tresCorregida = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nomina.getId()).get();
        assertEquals(0, new BigDecimal("400.00").compareTo(tresCorregida.getNetoAPagar()),
            "netoAPagar NUNCA se muta — sigue siendo el original congelado al aprobar");
        assertEquals(0, new BigDecimal("425.00").compareTo(ajusteNominaService.calcularNetoEfectivo(tenantId, tresCorregida)),
            "el neto EFECTIVO (original + correcciones) sí refleja el ajuste, calculado al vuelo");

        // Reverso: la marca REVERSADA y queda registrado el motivo.
        AjusteNomina reverso = ajusteNominaService.reversar(tenantId, nomina.getId(), "Empleado no trabajó ese período, nómina cargada por error");
        assertEquals(AjusteNomina.Tipo.REVERSO, reverso.getTipo());
        NominaEmpleado reversada = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nomina.getId()).get();
        assertEquals(NominaEmpleado.Estado.REVERSADA, reversada.getEstado());
    }

    @Test
    void multimonedaConTasaCongelada() {
        long tenantId = 73004L;
        prepararTenantConRolNomina(tenantId, "nomina73004");
        crearEmpleadoConAsignacion(tenantId, "Empleado pagado en VES", "VES", new BigDecimal("4000.00"));
        PeriodoNomina periodo = crearPeriodo(tenantId, "VES");

        motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", new BigDecimal("40.000000"), "MANUAL");
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());

        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);
        assertNotNull(nomina.getMontoEquivalenteBase());
        assertEquals("USD", nomina.getMonedaBaseEquivalente());
        BigDecimal equivalenteOriginal = nomina.getMontoEquivalenteBase();
        assertEquals(0, new BigDecimal("100.00").compareTo(equivalenteOriginal)); // 4000 VES / 40 = 100 USD

        // La tasa sube fuerte DESPUÉS de calculada la nómina.
        motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", new BigDecimal("80.000000"), "MANUAL");

        NominaEmpleado releida = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nomina.getId()).get();
        assertEquals(0, equivalenteOriginal.compareTo(releida.getMontoEquivalenteBase()),
            "El equivalente en moneda base debe quedar congelado — nunca se recalcula con la tasa vigente");
    }

    @Test
    void concurrenciaAlCalcularUnPeriodoNoDuplicaNominas() throws InterruptedException {
        long tenantId = 73005L;
        prepararTenantConRolNomina(tenantId, "nomina73005");
        crearEmpleadoConAsignacion(tenantId, "Empleado A", "USD", new BigDecimal("300.00"));
        crearEmpleadoConAsignacion(tenantId, "Empleado B", "USD", new BigDecimal("450.00"));
        PeriodoNomina periodo = crearPeriodo(tenantId, "USD");

        int hilos = 8;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);
        AtomicInteger exitosos = new AtomicInteger(0);
        AtomicInteger conflictos = new AtomicInteger(0);

        for (int i = 0; i < hilos; i++) {
            pool.submit(() -> {
                // Cada hilo necesita su propio TenantContext/AuthContext — son ThreadLocal.
                TenantContext.setCurrentTenant(tenantId);
                AuthContext.set("nomina73005", "CAJERO_VENDEDOR");
                try {
                    listos.countDown();
                    salida.await(10, TimeUnit.SECONDS);
                    motorNominaService.calcularPeriodo(tenantId, periodo.getId());
                    exitosos.incrementAndGet();
                } catch (ObjectOptimisticLockingFailureException | org.springframework.dao.DataIntegrityViolationException e) {
                    conflictos.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    TenantContext.clear();
                    AuthContext.clear();
                    terminados.countDown();
                }
            });
        }

        listos.await(5, TimeUnit.SECONDS);
        salida.countDown();
        assertTrue(terminados.await(20, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(1, exitosos.get(), "Solo UN hilo debe ganar la carrera y calcular el período");
        assertEquals(hilos - 1, conflictos.get(), "Los demás deben fallar con un conflicto de concurrencia, no insertar datos");

        List<NominaEmpleado> nominas = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId());
        assertEquals(2, nominas.size(), "Exactamente una NominaEmpleado por empleado — nunca duplicada");
    }
}
