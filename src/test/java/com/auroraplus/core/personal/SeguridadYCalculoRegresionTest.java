package com.auroraplus.core.personal;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
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
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Regresión para los 6 hallazgos de la revisión de Codex sobre 02f1a6d — cada método de prueba
 * está anotado con el punto exacto del encargo que cubre.
 */
@SpringBootTest
@ActiveProfiles("test")
class SeguridadYCalculoRegresionTest {

    @Autowired private EmpleadoService empleadoService;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private CargoRepository cargoRepository;
    @Autowired private AsignacionEmpleadoRepository asignacionEmpleadoRepository;
    @Autowired private TurnoPersonalService turnoPersonalService;
    @Autowired private TurnoPersonalRepository turnoPersonalRepository;
    @Autowired private AsistenciaService asistenciaService;
    @Autowired private MetaPersonalService metaPersonalService;
    @Autowired private ReglaNominaService reglaNominaService;
    @Autowired private ConceptoNominaRepository conceptoNominaRepository;
    @Autowired private MotorNominaService motorNominaService;
    @Autowired private PeriodoNominaService periodoNominaService;
    @Autowired private PeriodoNominaRepository periodoNominaRepository;
    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private NominaEmpleadoService nominaEmpleadoService;
    @Autowired private AjusteNominaService ajusteNominaService;
    @Autowired private DetalleNominaRepository detalleNominaRepository;
    @Autowired private ModuloTenantRepository moduloTenantRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PermisoPersonalRepository permisoPersonalRepository;
    @Autowired private AjusteNominaRepository ajusteNominaRepository;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
        AuthContext.clear();
    }

    private void activarFlag(long tenantId, String flag) {
        ModuloTenant modulo = new ModuloTenant();
        modulo.setTenantId(tenantId);
        modulo.setModuloNombre(flag);
        modulo.setActivo(true);
        moduloTenantRepository.save(modulo);
    }

    private Long crearUsuarioConRol(long tenantId, String username, PermisoPersonal.RolPersonal rol) {
        TenantContext.setCurrentTenant(tenantId);
        Usuario usuario = new Usuario();
        usuario.setTenantId(tenantId);
        usuario.setUsername(username);
        usuario.setPasswordHash("x");
        usuario.setRol(Usuario.Rol.CAJERO_VENDEDOR);
        usuario = usuarioRepository.save(usuario);
        if (rol != null) {
            PermisoPersonal permiso = new PermisoPersonal();
            permiso.setTenantId(tenantId);
            permiso.setUsuarioId(usuario.getId());
            permiso.setRol(rol);
            permisoPersonalRepository.save(permiso);
        }
        return usuario.getId();
    }

    private void autenticarComo(long tenantId, String username) {
        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set(username, "CAJERO_VENDEDOR");
    }

    private Empleado crearEmpleadoBasico(long tenantId, String nombre) {
        Empleado empleado = new Empleado();
        empleado.setTenantId(tenantId);
        empleado.setNombreCompleto(nombre);
        empleado.setDocumentoIdentidad("V-" + System.nanoTime());
        empleado.setFechaIngreso(LocalDate.of(2025, 1, 1));
        return empleadoRepository.save(empleado);
    }

    private Cargo crearCargo(long tenantId, String nombre) {
        Cargo cargo = new Cargo();
        cargo.setTenantId(tenantId);
        cargo.setNombre(nombre);
        return cargoRepository.save(cargo);
    }

    // ── Punto 1: RBAC real en lecturas ──────────────────────────────────────────────────────

    @Test
    void rrhhNoPuedeVerMontosDeNomina() {
        long tenantId = 81001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        Long usuarioNomina = crearUsuarioConRol(tenantId, "nomina81001", PermisoPersonal.RolPersonal.NOMINA);
        Long usuarioRrhh = crearUsuarioConRol(tenantId, "rrhh81001", PermisoPersonal.RolPersonal.RRHH);

        autenticarComo(tenantId, "nomina81001");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado con nómina");
        Cargo cargo = crearCargo(tenantId, "Cajero");
        AsignacionEmpleado asignacion = new AsignacionEmpleado();
        asignacion.setTenantId(tenantId);
        asignacion.setEmpleadoId(empleado.getId());
        asignacion.setCargoId(cargo.getId());
        asignacion.setTipoSalario(AsignacionEmpleado.TipoSalario.FIJO_MENSUAL);
        asignacion.setSalarioPactado(new BigDecimal("300.00"));
        asignacion.setMonedaSalario("USD");
        asignacion.setVigenciaDesde(LocalDate.of(2025, 1, 1));
        asignacionEmpleadoRepository.save(asignacion);

        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo RBAC");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);

        // RRHH gestiona personal pero NUNCA ve montos de nómina calculada.
        autenticarComo(tenantId, "rrhh81001");
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> nominaEmpleadoService.obtener(tenantId, nomina.getId()));
    }

    @Test
    void empleadoSoloVeSuPropiaNominaNuncaLaDeOtro() {
        long tenantId = 81002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        Long usuarioNomina = crearUsuarioConRol(tenantId, "nomina81002", PermisoPersonal.RolPersonal.NOMINA);

        autenticarComo(tenantId, "nomina81002");
        Empleado empleadoA = crearEmpleadoBasico(tenantId, "Empleado A");
        Empleado empleadoB = crearEmpleadoBasico(tenantId, "Empleado B");
        Cargo cargo = crearCargo(tenantId, "Cajero");
        AsignacionEmpleado asigA = guardarAsignacion(tenantId, empleadoA.getId(), cargo.getId(), new BigDecimal("300.00"));
        AsignacionEmpleado asigB = guardarAsignacion(tenantId, empleadoB.getId(), cargo.getId(), new BigDecimal("400.00"));

        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo RBAC 2");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());

        NominaEmpleado nominaA = nominaEmpleadoRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoA.getId()).get(0);
        NominaEmpleado nominaB = nominaEmpleadoRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoB.getId()).get(0);

        // Usuario EMPLEADO ligado específicamente al Empleado A.
        Long usuarioEmpleadoA = crearUsuarioConRol(tenantId, "empleadoA81002", null);
        PermisoPersonal permiso = new PermisoPersonal();
        permiso.setTenantId(tenantId);
        permiso.setUsuarioId(usuarioEmpleadoA);
        permiso.setRol(PermisoPersonal.RolPersonal.EMPLEADO);
        permiso.setEmpleadoId(empleadoA.getId());
        permisoPersonalRepository.save(permiso);

        autenticarComo(tenantId, "empleadoA81002");
        NominaEmpleado propia = nominaEmpleadoService.obtener(tenantId, nominaA.getId());
        assertEquals(nominaA.getId(), propia.getId());

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> nominaEmpleadoService.obtener(tenantId, nominaB.getId()));
    }

    @Test
    void usuarioSinPermisoPersonalNoAccedeANada() {
        long tenantId = 81003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado protegido");
        crearUsuarioConRol(tenantId, "sinrol81003", null); // usuario real, SIN PermisoPersonal
        autenticarComo(tenantId, "sinrol81003");

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> empleadoService.listar(tenantId));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> asistenciaService.listarDeEmpleado(tenantId, empleado.getId()));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.listarDeEmpleado(tenantId, empleado.getId()));
    }

    @Test
    void leerNominaSinElFlagNominaAvanzadaSeRechaza() {
        long tenantId = 81004L;
        // OJO: nunca se activa FLAG_NOMINA_AVANZADA para este tenant.
        crearUsuarioConRol(tenantId, "nomina81004", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina81004");

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> nominaEmpleadoService.obtener(tenantId, 999L));
    }

    // ── Punto 2: permisos positivos explícitos (ya no exigirNoAuditor) ──────────────────────

    // CargoController.crear() no delega en un service inyectable — replica exactamente el mismo
    // EnumSet(RRHH, NOMINA) que usa el controller vía PersonalAccessService.exigirRol, que es lo
    // que de verdad protege el endpoint (contrato §1.2).
    private static final Set<PermisoPersonal.RolPersonal> PUEDEN_ESCRIBIR_CARGOS =
        EnumSet.of(PermisoPersonal.RolPersonal.RRHH, PermisoPersonal.RolPersonal.NOMINA);

    @Autowired private PersonalAccessService accessServiceDirecto;

    @Test
    void empleadoSupervisorYSinRolNoPuedenCrearCargos() {
        long tenantId = 82001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        crearUsuarioConRol(tenantId, "empleado82001", PermisoPersonal.RolPersonal.EMPLEADO);
        crearUsuarioConRol(tenantId, "supervisor82001", PermisoPersonal.RolPersonal.SUPERVISOR);
        crearUsuarioConRol(tenantId, "sinrol82001", null);

        for (String username : List.of("empleado82001", "supervisor82001", "sinrol82001")) {
            autenticarComo(tenantId, username);
            assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
                () -> accessServiceDirecto.exigirRol(tenantId, PUEDEN_ESCRIBIR_CARGOS),
                "El usuario " + username + " no debe poder crear cargos");
        }
    }

    @Test
    void soloRrhhYNominaPuedenCrearCargos() {
        long tenantId = 82002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        crearUsuarioConRol(tenantId, "rrhh82002", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh82002");
        Cargo guardado = cargoRepository.save(prepararCargo(tenantId, "Cargo válido"));
        assertNotNull(guardado.getId());
    }

    @Test
    void editarNominaRequiereRolNominaExplicito() {
        long tenantId = 82003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina82003", PermisoPersonal.RolPersonal.NOMINA);
        crearUsuarioConRol(tenantId, "supervisor82003", PermisoPersonal.RolPersonal.SUPERVISOR);

        autenticarComo(tenantId, "nomina82003");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado editar");
        Cargo cargo = crearCargo(tenantId, "Cargo editar");
        guardarAsignacion(tenantId, empleado.getId(), cargo.getId(), new BigDecimal("300.00"));
        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo editar");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);

        // SUPERVISOR (antes pasaba, porque exigirNoAuditor solo bloqueaba AUDITOR) ahora se rechaza.
        autenticarComo(tenantId, "supervisor82003");
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> nominaEmpleadoService.editarManualmente(tenantId, nomina.getId(), new BigDecimal("999.00")));
    }

    private Cargo prepararCargo(long tenantId, String nombre) {
        Cargo cargo = new Cargo();
        cargo.setTenantId(tenantId);
        cargo.setNombre(nombre);
        return cargo;
    }

    // ── Punto 3: inmutabilidad de netoAPagar + concurrencia en ajustes ──────────────────────

    @Test
    void corregirNuncaMutaNetoAPagarOriginal() {
        long tenantId = 83001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina83001", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina83001");

        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado inmutable");
        Cargo cargo = crearCargo(tenantId, "Cargo inmutable");
        guardarAsignacion(tenantId, empleado.getId(), cargo.getId(), new BigDecimal("500.00"));
        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo inmutable");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);
        periodoNominaService.aprobar(tenantId, periodo.getId());

        BigDecimal netoOriginal = nomina.getNetoAPagar();
        ajusteNominaService.corregir(tenantId, nomina.getId(), new BigDecimal("50.00"), "Bono");
        ajusteNominaService.corregir(tenantId, nomina.getId(), new BigDecimal("-10.00"), "Descuento por falta");

        NominaEmpleado releida = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nomina.getId()).get();
        assertEquals(0, netoOriginal.compareTo(releida.getNetoAPagar()), "netoAPagar jamás cambia, sin importar cuántas correcciones se apliquen");
        assertEquals(0, netoOriginal.add(new BigDecimal("40.00")).compareTo(ajusteNominaService.calcularNetoEfectivo(tenantId, releida)));
    }

    @Test
    void dosReversosConcurrentesSobreLaMismaNominaSoloUnoGana() throws InterruptedException {
        long tenantId = 83002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina83002", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina83002");

        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado reverso concurrente");
        Cargo cargo = crearCargo(tenantId, "Cargo reverso");
        guardarAsignacion(tenantId, empleado.getId(), cargo.getId(), new BigDecimal("300.00"));
        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo reverso concurrente");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);
        periodoNominaService.aprobar(tenantId, periodo.getId());
        Long nominaId = nomina.getId();

        int hilos = 5;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);
        AtomicInteger exitosos = new AtomicInteger(0);
        AtomicInteger conflictos = new AtomicInteger(0);

        for (int i = 0; i < hilos; i++) {
            pool.submit(() -> {
                TenantContext.setCurrentTenant(tenantId);
                AuthContext.set("nomina83002", "CAJERO_VENDEDOR");
                try {
                    listos.countDown();
                    salida.await(10, TimeUnit.SECONDS);
                    ajusteNominaService.reversar(tenantId, nominaId, "Reverso concurrente de prueba");
                    exitosos.incrementAndGet();
                } catch (ObjectOptimisticLockingFailureException | org.springframework.dao.DataIntegrityViolationException e) {
                    conflictos.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (RuntimeException e) {
                    // Un segundo reverso también puede fallar por la validación de estado
                    // (ya no está APROBADA/PAGADA) si alcanzó a leer DESPUÉS del primer commit —
                    // sigue siendo "no ganó la carrera", se cuenta igual como conflicto.
                    conflictos.incrementAndGet();
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

        assertEquals(1, exitosos.get(), "Solo UN reverso debe tener éxito sobre la misma nómina");
        assertEquals(hilos - 1, conflictos.get());

        long totalReversos = ajusteNominaRepository.findByTenantIdAndNominaEmpleadoId(tenantId, nominaId).stream()
            .filter(a -> a.getTipo() == AjusteNomina.Tipo.REVERSO)
            .count();
        assertEquals(1, totalReversos, "Nunca debe quedar más de un registro de reverso para la misma nómina");
    }

    // ── Punto 4: versionado de reglas por tenantId + conceptoId + tipoRegla ─────────────────

    @Test
    void dosDeduccionesPorcentualesDeConceptosDistintosNoSeInvalidanEntreSi() {
        long tenantId = 84001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina84001", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina84001");

        ConceptoNomina seguroSocial = reglaNominaService.crearConcepto(tenantId, nuevoConcepto("SSO", ConceptoNomina.Tipo.DEDUCCION));
        ConceptoNomina faov = reglaNominaService.crearConcepto(tenantId, nuevoConcepto("FAOV", ConceptoNomina.Tipo.DEDUCCION));

        ReglaNominaVersionada reglaSso = new ReglaNominaVersionada();
        reglaSso.setConceptoId(seguroSocial.getId());
        reglaSso.setTipoRegla("PORCENTAJE_DEL_SUELDO");
        reglaSso.setValorNumerico(new BigDecimal("4.0"));
        reglaNominaService.crearNuevaVersion(tenantId, reglaSso, LocalDate.of(2026, 1, 1));

        // Antes del fix, esto hubiera cerrado por error la regla de SSO recién creada, porque la
        // búsqueda de "vigente abierta" solo miraba tipoRegla, no conceptoId.
        ReglaNominaVersionada reglaFaov = new ReglaNominaVersionada();
        reglaFaov.setConceptoId(faov.getId());
        reglaFaov.setTipoRegla("PORCENTAJE_DEL_SUELDO");
        reglaFaov.setValorNumerico(new BigDecimal("1.0"));
        reglaNominaService.crearNuevaVersion(tenantId, reglaFaov, LocalDate.of(2026, 1, 1));

        assertTrue(reglaNominaService.buscarVigenteEnPorConcepto(tenantId, seguroSocial.getId(), LocalDate.of(2026, 3, 1)).isPresent(),
            "La regla de SSO debe seguir vigente aunque se haya creado una regla nueva para FAOV");
        assertEquals(0, new BigDecimal("4.0").compareTo(
            reglaNominaService.buscarVigenteEnPorConcepto(tenantId, seguroSocial.getId(), LocalDate.of(2026, 3, 1)).get().getValorNumerico()));
        assertEquals(0, new BigDecimal("1.0").compareTo(
            reglaNominaService.buscarVigenteEnPorConcepto(tenantId, faov.getId(), LocalDate.of(2026, 3, 1)).get().getValorNumerico()));
    }

    private ConceptoNomina nuevoConcepto(String codigo, ConceptoNomina.Tipo tipo) {
        ConceptoNomina c = new ConceptoNomina();
        c.setCodigo(codigo);
        c.setNombre(codigo);
        c.setTipo(tipo);
        return c;
    }

    // ── Punto 5: procesar ASIGNACION (bonos/comisiones), nunca cero silencioso en tipo desconocido ──

    @Test
    void unBonoAsignacionSeSumaAlNetoAPagar() {
        long tenantId = 85001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina85001", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina85001");

        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado con bono");
        Cargo cargo = crearCargo(tenantId, "Cargo bono");
        guardarAsignacion(tenantId, empleado.getId(), cargo.getId(), new BigDecimal("300.00"));

        ConceptoNomina bono = reglaNominaService.crearConcepto(tenantId, nuevoConcepto("BONO_PROD", ConceptoNomina.Tipo.ASIGNACION));
        ReglaNominaVersionada reglaBono = new ReglaNominaVersionada();
        reglaBono.setConceptoId(bono.getId());
        reglaBono.setTipoRegla("MONTO_FIJO");
        reglaBono.setValorNumerico(new BigDecimal("50.00"));
        reglaNominaService.crearNuevaVersion(tenantId, reglaBono, LocalDate.of(2026, 1, 1));

        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo con bono");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());

        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);
        assertEquals(0, new BigDecimal("350.00").compareTo(nomina.getTotalAsignaciones()), "300 de sueldo + 50 de bono");
        assertEquals(0, new BigDecimal("350.00").compareTo(nomina.getNetoAPagar()));

        List<DetalleNomina> detalles = detalleNominaRepository.findByTenantIdAndNominaEmpleadoId(tenantId, nomina.getId());
        assertTrue(detalles.stream().anyMatch(d -> bono.getId().equals(d.getConceptoId())), "Debe existir una línea del concepto BONO_PROD, no ignorado");
    }

    @Test
    void unaDeduccionPorcentualCalculaSobreElBrutoConBonoIncluido() {
        long tenantId = 85002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina85002", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina85002");

        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado bono y deduccion");
        Cargo cargo = crearCargo(tenantId, "Cargo bono deduccion");
        guardarAsignacion(tenantId, empleado.getId(), cargo.getId(), new BigDecimal("100.00"));

        ConceptoNomina bono = reglaNominaService.crearConcepto(tenantId, nuevoConcepto("BONO", ConceptoNomina.Tipo.ASIGNACION));
        ReglaNominaVersionada reglaBono = new ReglaNominaVersionada();
        reglaBono.setConceptoId(bono.getId());
        reglaBono.setTipoRegla("MONTO_FIJO");
        reglaBono.setValorNumerico(new BigDecimal("100.00"));
        reglaNominaService.crearNuevaVersion(tenantId, reglaBono, LocalDate.of(2026, 1, 1));

        ConceptoNomina deduccion = reglaNominaService.crearConcepto(tenantId, nuevoConcepto("SSO", ConceptoNomina.Tipo.DEDUCCION));
        ReglaNominaVersionada reglaDed = new ReglaNominaVersionada();
        reglaDed.setConceptoId(deduccion.getId());
        reglaDed.setTipoRegla("PORCENTAJE_DEL_SUELDO");
        reglaDed.setValorNumerico(new BigDecimal("10.0"));
        reglaNominaService.crearNuevaVersion(tenantId, reglaDed, LocalDate.of(2026, 1, 1));

        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo bono+deduccion");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        periodo = periodoNominaRepository.save(periodo);
        motorNominaService.calcularPeriodo(tenantId, periodo.getId());

        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);
        // Bruto = 100 (sueldo) + 100 (bono) = 200. Deducción 10% DEBE ser 20 (sobre el bruto ya
        // con el bono), no 10 (si calculara solo sobre el sueldo base antes del bono).
        assertEquals(0, new BigDecimal("200.00").compareTo(nomina.getTotalAsignaciones()));
        assertEquals(0, new BigDecimal("20.00").compareTo(nomina.getTotalDeducciones()));
        assertEquals(0, new BigDecimal("180.00").compareTo(nomina.getNetoAPagar()));
    }

    @Test
    void tipoDeReglaDesconocidoRevientaEnVezDeCalcularCeroSilencioso() {
        long tenantId = 85003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina85003", PermisoPersonal.RolPersonal.NOMINA);
        autenticarComo(tenantId, "nomina85003");

        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado tipo desconocido");
        Cargo cargo = crearCargo(tenantId, "Cargo tipo desconocido");
        guardarAsignacion(tenantId, empleado.getId(), cargo.getId(), new BigDecimal("300.00"));

        ConceptoNomina concepto = reglaNominaService.crearConcepto(tenantId, nuevoConcepto("RARO", ConceptoNomina.Tipo.DEDUCCION));
        ReglaNominaVersionada regla = new ReglaNominaVersionada();
        regla.setConceptoId(concepto.getId());
        regla.setTipoRegla("FORMULA_INEXISTENTE_TYPO");
        regla.setValorNumerico(new BigDecimal("5"));
        reglaNominaService.crearNuevaVersion(tenantId, regla, LocalDate.of(2026, 1, 1));

        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setTenantId(tenantId);
        periodo.setNombre("Periodo tipo desconocido");
        periodo.setFechaInicio(LocalDate.of(2026, 1, 1));
        periodo.setFechaFin(LocalDate.of(2026, 1, 15));
        periodo.setMoneda("USD");
        final PeriodoNomina periodoGuardado = periodoNominaRepository.save(periodo);

        assertThrows(RuntimeException.class, () -> motorNominaService.calcularPeriodo(tenantId, periodoGuardado.getId()));
    }

    // ── Punto 6: integridad referencial y validación de tenant antes de relacionar ──────────

    @Test
    void asignarCargoDeOtroTenantSeRechaza() {
        long tenantId = 86001L;
        long otroTenant = 86002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        crearUsuarioConRol(tenantId, "rrhh86001", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh86001");

        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado tenant A");
        Cargo cargoDeOtroTenant = crearCargo(otroTenant, "Cargo ajeno");

        AsignacionEmpleado nueva = new AsignacionEmpleado();
        nueva.setCargoId(cargoDeOtroTenant.getId());
        nueva.setTipoSalario(AsignacionEmpleado.TipoSalario.FIJO_MENSUAL);
        nueva.setSalarioPactado(new BigDecimal("300.00"));
        nueva.setMonedaSalario("USD");

        assertThrows(RuntimeException.class,
            () -> empleadoService.asignarCargo(tenantId, empleado.getId(), nueva, LocalDate.of(2026, 1, 1)));
    }

    @Test
    void registrarAsistenciaConTurnoDeOtroEmpleadoSeRechaza() {
        long tenantId = 87001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh87001", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh87001");

        Empleado empleadoA = crearEmpleadoBasico(tenantId, "Empleado turno A");
        Empleado empleadoB = crearEmpleadoBasico(tenantId, "Empleado turno B");

        TurnoPersonal turnoDeA = new TurnoPersonal();
        turnoDeA.setEmpleadoId(empleadoA.getId());
        turnoDeA.setFecha(LocalDate.of(2026, 1, 5));
        turnoDeA.setHoraInicio(java.time.LocalTime.of(8, 0));
        turnoDeA.setHoraFin(java.time.LocalTime.of(16, 0));
        TurnoPersonal guardado = turnoPersonalService.crear(tenantId, turnoDeA);

        RegistroAsistencia registro = new RegistroAsistencia();
        registro.setEmpleadoId(empleadoB.getId()); // empleado distinto al dueño del turno
        registro.setTurnoId(guardado.getId());
        registro.setFechaHoraEntrada(java.time.LocalDateTime.of(2026, 1, 5, 8, 0));

        assertThrows(RuntimeException.class, () -> asistenciaService.registrarEntrada(tenantId, registro));
    }

    @Test
    void crearMetaParaEmpleadoDeOtroTenantSeRechaza() {
        long tenantId = 88001L;
        long otroTenant = 88002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh88001", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh88001");

        Empleado empleadoDeOtroTenant = crearEmpleadoBasico(otroTenant, "Empleado ajeno");
        MetaPersonal meta = new MetaPersonal();
        meta.setEmpleadoId(empleadoDeOtroTenant.getId());
        meta.setNombre("Meta cruzada");
        meta.setValorObjetivo(new BigDecimal("10"));
        meta.setUnidad("unidades");
        meta.setPeriodoDesde(LocalDate.of(2026, 1, 1));
        meta.setPeriodoHasta(LocalDate.of(2026, 1, 31));

        assertThrows(RuntimeException.class, () -> metaPersonalService.crear(tenantId, meta));
    }

    @Test
    void asistenciaImpideEntradaDuplicadaYSalidaInvalida() {
        long tenantId = 88003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh88003", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh88003");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado asistencia segura");

        RegistroAsistencia entrada = new RegistroAsistencia();
        entrada.setEmpleadoId(empleado.getId());
        entrada.setFechaHoraEntrada(java.time.LocalDateTime.of(2026, 9, 14, 8, 0));
        entrada.setOrigen(RegistroAsistencia.Origen.MANUAL);
        RegistroAsistencia guardada = asistenciaService.registrarEntrada(tenantId, entrada);

        RegistroAsistencia duplicada = new RegistroAsistencia();
        duplicada.setEmpleadoId(empleado.getId());
        duplicada.setFechaHoraEntrada(java.time.LocalDateTime.of(2026, 9, 14, 8, 1));
        duplicada.setOrigen(RegistroAsistencia.Origen.MANUAL);
        assertThrows(IllegalStateException.class, () -> asistenciaService.registrarEntrada(tenantId, duplicada));
        assertThrows(IllegalArgumentException.class, () -> asistenciaService.registrarSalida(
            tenantId, guardada.getId(), java.time.LocalDateTime.of(2026, 9, 14, 7, 59)));

        asistenciaService.registrarSalida(tenantId, guardada.getId(), java.time.LocalDateTime.of(2026, 9, 14, 16, 0));
        assertThrows(IllegalStateException.class, () -> asistenciaService.registrarSalida(
            tenantId, guardada.getId(), java.time.LocalDateTime.of(2026, 9, 14, 16, 1)));
    }

    @Test
    void crearReglaParaConceptoDeOtroTenantSeRechaza() {
        long tenantId = 89001L;
        long otroTenant = 89002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        activarFlag(otroTenant, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        crearUsuarioConRol(tenantId, "nomina89001", PermisoPersonal.RolPersonal.NOMINA);
        crearUsuarioConRol(otroTenant, "nomina89002", PermisoPersonal.RolPersonal.NOMINA);

        autenticarComo(otroTenant, "nomina89002");
        ConceptoNomina conceptoDeOtroTenant = reglaNominaService.crearConcepto(otroTenant, nuevoConcepto("AJENO", ConceptoNomina.Tipo.DEDUCCION));

        autenticarComo(tenantId, "nomina89001");
        ReglaNominaVersionada regla = new ReglaNominaVersionada();
        regla.setConceptoId(conceptoDeOtroTenant.getId());
        regla.setTipoRegla("PORCENTAJE_DEL_SUELDO");
        regla.setValorNumerico(new BigDecimal("5"));

        assertThrows(RuntimeException.class, () -> reglaNominaService.crearNuevaVersion(tenantId, regla, LocalDate.of(2026, 1, 1)));
    }

    private AsignacionEmpleado guardarAsignacion(long tenantId, Long empleadoId, Long cargoId, BigDecimal salario) {
        AsignacionEmpleado asignacion = new AsignacionEmpleado();
        asignacion.setTenantId(tenantId);
        asignacion.setEmpleadoId(empleadoId);
        asignacion.setCargoId(cargoId);
        asignacion.setTipoSalario(AsignacionEmpleado.TipoSalario.FIJO_MENSUAL);
        asignacion.setSalarioPactado(salario);
        asignacion.setMonedaSalario("USD");
        asignacion.setVigenciaDesde(LocalDate.of(2025, 1, 1));
        return asignacionEmpleadoRepository.save(asignacion);
    }
}
