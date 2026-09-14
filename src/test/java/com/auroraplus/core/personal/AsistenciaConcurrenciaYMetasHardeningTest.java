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
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Hardening pre-piloto del módulo Personal — cubre exactamente el encargo: concurrencia real de
 * asistencia (no solo el camino feliz), RBAC en asistencia/turnos/metas, y la semántica de
 * "progreso vigente" de Metas (nunca una suma). Complementa a SeguridadYCalculoRegresionTest, que
 * ya cubre RBAC/inmutabilidad/versionado de reglas del lado de cargos y nómina.
 */
@SpringBootTest
@ActiveProfiles("test")
class AsistenciaConcurrenciaYMetasHardeningTest {

    @Autowired private AsistenciaService asistenciaService;
    @Autowired private RegistroAsistenciaRepository registroAsistenciaRepository;
    @Autowired private TurnoPersonalService turnoPersonalService;
    @Autowired private MetaPersonalService metaPersonalService;
    @Autowired private SeguimientoMetaRepository seguimientoMetaRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private ModuloTenantRepository moduloTenantRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PermisoPersonalRepository permisoPersonalRepository;

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

    private void ligarEmpleado(long tenantId, Long usuarioId, Long empleadoId) {
        PermisoPersonal permiso = permisoPersonalRepository.findByTenantIdAndUsuarioId(tenantId, usuarioId).orElseThrow();
        permiso.setEmpleadoId(empleadoId);
        permisoPersonalRepository.save(permiso);
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

    private RegistroAsistencia nuevoRegistro(Long empleadoId, LocalDateTime entrada) {
        RegistroAsistencia registro = new RegistroAsistencia();
        registro.setEmpleadoId(empleadoId);
        registro.setFechaHoraEntrada(entrada);
        registro.setOrigen(RegistroAsistencia.Origen.MANUAL);
        return registro;
    }

    // ── Sección 1: Asistencia y concurrencia ────────────────────────────────────────────────

    @Test
    void dobleEntradaConcurrenteSoloUnaTieneExito() throws InterruptedException {
        long tenantId = 91001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh91001", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh91001");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado entrada concurrente");
        Long empleadoId = empleado.getId();

        int hilos = 6;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);
        AtomicInteger exitosos = new AtomicInteger(0);
        AtomicInteger rechazados = new AtomicInteger(0);

        for (int i = 0; i < hilos; i++) {
            pool.submit(() -> {
                TenantContext.setCurrentTenant(tenantId);
                AuthContext.set("rrhh91001", "CAJERO_VENDEDOR");
                try {
                    listos.countDown();
                    salida.await(10, TimeUnit.SECONDS);
                    asistenciaService.registrarEntrada(tenantId, nuevoRegistro(empleadoId, LocalDateTime.of(2026, 2, 1, 8, 0)));
                    exitosos.incrementAndGet();
                } catch (IllegalStateException e) {
                    rechazados.incrementAndGet();
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

        assertEquals(1, exitosos.get(), "Solo UNA entrada concurrente debe tener éxito para el mismo empleado");
        assertEquals(hilos - 1, rechazados.get());

        long entradasAbiertas = registroAsistenciaRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId).stream()
            .filter(r -> r.getFechaHoraSalida() == null).count();
        assertEquals(1, entradasAbiertas, "Nunca debe quedar más de una entrada abierta para el mismo empleado");
    }

    @Test
    void dobleSalidaConcurrenteSoloUnaTieneExito() throws InterruptedException {
        long tenantId = 91002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh91002", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh91002");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado salida concurrente");
        RegistroAsistencia abierto = asistenciaService.registrarEntrada(tenantId,
            nuevoRegistro(empleado.getId(), LocalDateTime.of(2026, 2, 1, 8, 0)));
        Long registroId = abierto.getId();

        int hilos = 6;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salidaLatch = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);
        AtomicInteger exitosos = new AtomicInteger(0);
        AtomicInteger rechazados = new AtomicInteger(0);

        for (int i = 0; i < hilos; i++) {
            final int offset = i;
            pool.submit(() -> {
                TenantContext.setCurrentTenant(tenantId);
                AuthContext.set("rrhh91002", "CAJERO_VENDEDOR");
                try {
                    listos.countDown();
                    salidaLatch.await(10, TimeUnit.SECONDS);
                    asistenciaService.registrarSalida(tenantId, registroId, LocalDateTime.of(2026, 2, 1, 16, offset));
                    exitosos.incrementAndGet();
                } catch (IllegalStateException e) {
                    rechazados.incrementAndGet();
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
        salidaLatch.countDown();
        assertTrue(terminados.await(20, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(1, exitosos.get(), "Solo UNA salida concurrente debe tener éxito sobre el mismo registro");
        assertEquals(hilos - 1, rechazados.get());

        RegistroAsistencia releido = registroAsistenciaRepository.findById(registroId).orElseThrow();
        assertNotNull(releido.getFechaHoraSalida());
        assertNull(releido.getMarcadorEntradaAbierta(), "El marcador de entrada abierta debe limpiarse al cerrar");
    }

    @Test
    void noSePuedeSobrescribirUnaSalidaYaRegistrada() {
        long tenantId = 91003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh91003", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh91003");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado sin sobrescritura");
        RegistroAsistencia registro = asistenciaService.registrarEntrada(tenantId,
            nuevoRegistro(empleado.getId(), LocalDateTime.of(2026, 2, 1, 8, 0)));
        asistenciaService.registrarSalida(tenantId, registro.getId(), LocalDateTime.of(2026, 2, 1, 16, 0));

        assertThrows(IllegalStateException.class,
            () -> asistenciaService.registrarSalida(tenantId, registro.getId(), LocalDateTime.of(2026, 2, 1, 18, 0)));

        RegistroAsistencia releido = registroAsistenciaRepository.findById(registro.getId()).orElseThrow();
        assertEquals(LocalDateTime.of(2026, 2, 1, 16, 0), releido.getFechaHoraSalida(), "La salida original nunca debe pisarse");
    }

    @Test
    void salidaAnteriorALaEntradaSeRechaza() {
        long tenantId = 91004L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh91004", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh91004");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado salida invalida");
        RegistroAsistencia registro = asistenciaService.registrarEntrada(tenantId,
            nuevoRegistro(empleado.getId(), LocalDateTime.of(2026, 2, 1, 8, 0)));

        assertThrows(IllegalArgumentException.class,
            () -> asistenciaService.registrarSalida(tenantId, registro.getId(), LocalDateTime.of(2026, 2, 1, 7, 0)));
    }

    @Test
    void noSeRegistraAsistenciaAEmpleadoInactivo() {
        long tenantId = 91005L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh91005", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh91005");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado inactivo");
        empleado.setFechaEgreso(LocalDate.of(2026, 1, 1));
        empleadoRepository.save(empleado);

        assertThrows(IllegalStateException.class,
            () -> asistenciaService.registrarEntrada(tenantId, nuevoRegistro(empleado.getId(), LocalDateTime.of(2026, 2, 1, 8, 0))));
    }

    @Test
    void asistenciaDeOtroTenantNoEsAccesible() {
        long tenantId = 91006L;
        long otroTenant = 91007L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        activarFlag(otroTenant, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh91006", PermisoPersonal.RolPersonal.RRHH);
        crearUsuarioConRol(otroTenant, "rrhh91007", PermisoPersonal.RolPersonal.RRHH);

        autenticarComo(tenantId, "rrhh91006");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado tenant A");
        RegistroAsistencia registro = asistenciaService.registrarEntrada(tenantId,
            nuevoRegistro(empleado.getId(), LocalDateTime.of(2026, 2, 1, 8, 0)));

        autenticarComo(otroTenant, "rrhh91007");
        assertThrows(RuntimeException.class,
            () -> asistenciaService.registrarSalida(otroTenant, registro.getId(), LocalDateTime.of(2026, 2, 1, 16, 0)));
        assertThrows(RuntimeException.class, () -> asistenciaService.listarDeEmpleado(otroTenant, empleado.getId()));
    }

    // ── Sección 2: RBAC (asistencia, turnos, metas) ─────────────────────────────────────────

    @Test
    void usuarioSinPermisoPersonalNoAccedeAAsistenciaTurnosNiMetas() {
        long tenantId = 92001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "sinrol92001", null);
        autenticarComo(tenantId, "sinrol92001");

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> asistenciaService.registrarEntrada(tenantId, nuevoRegistro(1L, LocalDateTime.now())));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> asistenciaService.listarDeEmpleado(tenantId, 1L));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> turnoPersonalService.listarDeEmpleado(tenantId, 1L));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.listarDeEmpleado(tenantId, 1L));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.crear(tenantId, nuevaMeta(1L)));
    }

    @Test
    void empleadoNoPuedeConsultarAsistenciaNiTurnosDeOtroEmpleado() {
        long tenantId = 92002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        crearUsuarioConRol(tenantId, "rrhh92002", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh92002");
        Empleado empleadoA = crearEmpleadoBasico(tenantId, "Empleado A asistencia");
        Empleado empleadoB = crearEmpleadoBasico(tenantId, "Empleado B asistencia");
        asistenciaService.registrarEntrada(tenantId, nuevoRegistro(empleadoA.getId(), LocalDateTime.of(2026, 2, 1, 8, 0)));

        Long usuarioEmpleadoA = crearUsuarioConRol(tenantId, "empleadoA92002", PermisoPersonal.RolPersonal.EMPLEADO);
        ligarEmpleado(tenantId, usuarioEmpleadoA, empleadoA.getId());

        autenticarComo(tenantId, "empleadoA92002");
        assertEquals(1, asistenciaService.listarDeEmpleado(tenantId, empleadoA.getId()).size(), "Puede ver la suya");
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> asistenciaService.listarDeEmpleado(tenantId, empleadoB.getId()));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> turnoPersonalService.listarDeEmpleado(tenantId, empleadoB.getId()));
    }

    @Test
    void auditorNoPuedeEscribirEnAsistenciaTurnosNiMetas() {
        long tenantId = 92003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh92003", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh92003");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado bajo auditoria");

        crearUsuarioConRol(tenantId, "auditor92003", PermisoPersonal.RolPersonal.AUDITOR);
        autenticarComo(tenantId, "auditor92003");

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> asistenciaService.registrarEntrada(tenantId, nuevoRegistro(empleado.getId(), LocalDateTime.of(2026, 2, 1, 8, 0))));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> turnoPersonalService.crear(tenantId, nuevoTurno(empleado.getId())));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.crear(tenantId, nuevaMeta(empleado.getId())));
    }

    @Test
    void featureFlagsApagadosRechazanAsistenciaYMetas() {
        long tenantId = 92004L;
        // Ningún flag activado a propósito.
        crearUsuarioConRol(tenantId, "rrhh92004", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh92004");

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> asistenciaService.registrarEntrada(tenantId, nuevoRegistro(1L, LocalDateTime.now())));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.crear(tenantId, nuevaMeta(1L)));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> turnoPersonalService.crear(tenantId, nuevoTurno(1L)));
    }

    @Test
    void metasDeOtroTenantNoSonAccesibles() {
        long tenantId = 92005L;
        long otroTenant = 92006L;
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        activarFlag(otroTenant, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh92005", PermisoPersonal.RolPersonal.RRHH);
        crearUsuarioConRol(otroTenant, "rrhh92006", PermisoPersonal.RolPersonal.RRHH);

        autenticarComo(tenantId, "rrhh92005");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado meta tenant A");
        MetaPersonal meta = metaPersonalService.crear(tenantId, nuevaMeta(empleado.getId()));

        autenticarComo(otroTenant, "rrhh92006");
        assertThrows(RuntimeException.class, () -> metaPersonalService.listarSeguimientos(otroTenant, meta.getId()),
            "La meta pertenece a otro tenant — no debe ni encontrarse");
        assertThrows(RuntimeException.class, () -> metaPersonalService.listarDeEmpleado(otroTenant, empleado.getId()),
            "El empleado pertenece a otro tenant — no debe ni encontrarse");
    }

    // ── Sección 3: Metas — orden de seguimientos y "progreso vigente" ──────────────────────

    @Test
    void listarSeguimientosOrdenaPorFechaLuegoPorId() {
        long tenantId = 93001L;
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh93001", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh93001");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado orden seguimientos");
        MetaPersonal meta = metaPersonalService.crear(tenantId, nuevaMeta(empleado.getId()));

        // Insertados fuera de orden cronológico a propósito, y dos comparten la MISMA fecha.
        SeguimientoMeta s3 = metaPersonalService.registrarAvance(tenantId, meta.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 20), "30"));
        SeguimientoMeta s1 = metaPersonalService.registrarAvance(tenantId, meta.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 10), "10"));
        SeguimientoMeta s2a = metaPersonalService.registrarAvance(tenantId, meta.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 15), "20"));
        SeguimientoMeta s2b = metaPersonalService.registrarAvance(tenantId, meta.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 15), "25"));

        List<SeguimientoMeta> ordenados = metaPersonalService.listarSeguimientos(tenantId, meta.getId());
        assertEquals(List.of(s1.getId(), s2a.getId(), s2b.getId(), s3.getId()),
            ordenados.stream().map(SeguimientoMeta::getId).toList(),
            "Orden esperado: por fecha ascendente, y por id ascendente entre los que comparten fecha");
    }

    @Test
    void progresoVigenteEsElUltimoRegistroCronologicoNuncaLaSuma() {
        long tenantId = 93002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh93002", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh93002");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado progreso vigente");
        MetaPersonal meta = metaPersonalService.crear(tenantId, nuevaMeta(empleado.getId()));

        metaPersonalService.registrarAvance(tenantId, meta.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 10), "100"));
        metaPersonalService.registrarAvance(tenantId, meta.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 20), "300"));

        BigDecimal progreso = metaPersonalService.obtenerProgresoVigente(tenantId, meta.getId());
        assertEquals(0, new BigDecimal("300").compareTo(progreso), "Debe ser el último acumulado reportado (300), no 100+300=400");
    }

    @Test
    void progresoVigenteSinSeguimientosEsCero() {
        long tenantId = 93003L;
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh93003", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh93003");
        Empleado empleado = crearEmpleadoBasico(tenantId, "Empleado sin seguimientos");
        MetaPersonal meta = metaPersonalService.crear(tenantId, nuevaMeta(empleado.getId()));

        assertEquals(0, BigDecimal.ZERO.compareTo(metaPersonalService.obtenerProgresoVigente(tenantId, meta.getId())));
    }

    @Test
    void empleadoSoloConsultaSusPropiasMetasYSeguimientos() {
        long tenantId = 93004L;
        activarFlag(tenantId, PersonalAccessService.FLAG_METAS);
        crearUsuarioConRol(tenantId, "rrhh93004", PermisoPersonal.RolPersonal.RRHH);
        autenticarComo(tenantId, "rrhh93004");
        Empleado empleadoA = crearEmpleadoBasico(tenantId, "Empleado A metas");
        Empleado empleadoB = crearEmpleadoBasico(tenantId, "Empleado B metas");
        MetaPersonal metaA = metaPersonalService.crear(tenantId, nuevaMeta(empleadoA.getId()));
        MetaPersonal metaB = metaPersonalService.crear(tenantId, nuevaMeta(empleadoB.getId()));
        metaPersonalService.registrarAvance(tenantId, metaA.getId(), nuevoSeguimiento(LocalDate.of(2026, 1, 10), "50"));

        Long usuarioEmpleadoA = crearUsuarioConRol(tenantId, "empleadoA93004", PermisoPersonal.RolPersonal.EMPLEADO);
        ligarEmpleado(tenantId, usuarioEmpleadoA, empleadoA.getId());

        autenticarComo(tenantId, "empleadoA93004");
        assertEquals(1, metaPersonalService.listarDeEmpleado(tenantId, empleadoA.getId()).size());
        assertEquals(1, metaPersonalService.listarSeguimientos(tenantId, metaA.getId()).size());

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.listarDeEmpleado(tenantId, empleadoB.getId()));
        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> metaPersonalService.listarSeguimientos(tenantId, metaB.getId()));
    }

    private MetaPersonal nuevaMeta(Long empleadoId) {
        MetaPersonal meta = new MetaPersonal();
        meta.setEmpleadoId(empleadoId);
        meta.setNombre("Meta de prueba");
        meta.setValorObjetivo(new BigDecimal("500"));
        meta.setUnidad("unidades");
        meta.setPeriodoDesde(LocalDate.of(2026, 1, 1));
        meta.setPeriodoHasta(LocalDate.of(2026, 1, 31));
        return meta;
    }

    private SeguimientoMeta nuevoSeguimiento(LocalDate fecha, String valorAlcanzado) {
        SeguimientoMeta seguimiento = new SeguimientoMeta();
        seguimiento.setFecha(fecha);
        seguimiento.setValorAlcanzado(new BigDecimal(valorAlcanzado));
        return seguimiento;
    }

    private TurnoPersonal nuevoTurno(Long empleadoId) {
        TurnoPersonal turno = new TurnoPersonal();
        turno.setEmpleadoId(empleadoId);
        turno.setFecha(LocalDate.of(2026, 2, 1));
        turno.setHoraInicio(LocalTime.of(8, 0));
        turno.setHoraFin(LocalTime.of(16, 0));
        return turno;
    }
}
