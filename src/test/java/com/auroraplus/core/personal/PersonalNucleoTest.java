package com.auroraplus.core.personal;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.personal.entities.Empleado;
import com.auroraplus.core.personal.entities.PermisoPersonal;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import com.auroraplus.core.personal.repositories.PermisoPersonalRepository;
import com.auroraplus.core.personal.services.EmpleadoService;
import com.auroraplus.core.personal.services.PersonalAccessService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * docs/personal-nomina-contract.md §7 — aislamiento entre tenants, empleado sin usuario,
 * permisos por rol, feature flag desactivado.
 */
@SpringBootTest
@ActiveProfiles("test")
class PersonalNucleoTest {

    @Autowired private EmpleadoService empleadoService;
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

    private Usuario crearUsuario(long tenantId, String username, Usuario.Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setTenantId(tenantId);
        usuario.setUsername(username);
        usuario.setPasswordHash("hash-de-prueba");
        usuario.setRol(rol);
        return usuarioRepository.save(usuario);
    }

    private void autenticarComo(long tenantId, String username, String rolGlobal) {
        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set(username, rolGlobal);
    }

    @Test
    void feactureFlagDesactivadoRechazaAccesoExplicitamenteNoListaVacia() {
        long tenantId = 71001L;
        autenticarComo(tenantId, "dueno71001", "DUENO_ADMIN");
        crearUsuario(tenantId, "dueno71001", Usuario.Rol.DUENO_ADMIN);
        // OJO: nunca se activa el flag "personal" para este tenant.

        PersonalAccessService.AccesoPersonalDenegadoException ex = assertThrows(
            PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> empleadoService.listar(tenantId));
        assertTrue(ex.getMessage().contains("personal"), "El mensaje debe explicar qué módulo falta, no devolver una lista vacía silenciosa");
    }

    @Test
    void empleadoSinUsuarioEsValidoYElRestoDelModuloOperaIgual() {
        long tenantId = 71002L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        autenticarComo(tenantId, "dueno71002", "DUENO_ADMIN");
        crearUsuario(tenantId, "dueno71002", Usuario.Rol.DUENO_ADMIN);

        Empleado empleado = new Empleado();
        empleado.setNombreCompleto("Peón de finca sin acceso al sistema");
        empleado.setDocumentoIdentidad("V-11111111");
        empleado.setFechaIngreso(LocalDate.of(2026, 1, 1));
        empleado.setUsuarioId(null);

        Empleado guardado = empleadoService.crear(tenantId, empleado);
        assertNotNull(guardado.getId());
        assertNull(guardado.getUsuarioId());
        assertTrue(guardado.isActivo());

        List<Empleado> listados = empleadoService.listar(tenantId);
        assertEquals(1, listados.size());
    }

    @Test
    void aislamientoEntreTenants() {
        long tenantA = 71003L;
        long tenantB = 71004L;
        activarFlag(tenantA, PersonalAccessService.FLAG_PERSONAL);
        activarFlag(tenantB, PersonalAccessService.FLAG_PERSONAL);

        autenticarComo(tenantA, "duenoA", "DUENO_ADMIN");
        crearUsuario(tenantA, "duenoA", Usuario.Rol.DUENO_ADMIN);
        Empleado empleadoA = new Empleado();
        empleadoA.setNombreCompleto("Empleado del tenant A");
        empleadoA.setDocumentoIdentidad("V-1");
        empleadoA.setFechaIngreso(LocalDate.of(2026, 1, 1));
        empleadoService.crear(tenantA, empleadoA);

        TenantContext.clear();
        AuthContext.clear();
        autenticarComo(tenantB, "duenoB", "DUENO_ADMIN");
        crearUsuario(tenantB, "duenoB", Usuario.Rol.DUENO_ADMIN);

        List<Empleado> deB = empleadoService.listar(tenantB);
        assertTrue(deB.isEmpty(), "El tenant B no debe ver empleados del tenant A");

        List<Empleado> deA = empleadoRepository.findByTenantId(tenantA);
        assertEquals(1, deA.size());
    }

    @Test
    void unRolSinPermisoNoPuedeEscribirEmpleados() {
        long tenantId = 71005L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        autenticarComo(tenantId, "auditor71005", "CAJERO_VENDEDOR"); // rol global sin relevancia acá
        Usuario usuario = crearUsuario(tenantId, "auditor71005", Usuario.Rol.CAJERO_VENDEDOR);

        PermisoPersonal permiso = new PermisoPersonal();
        permiso.setTenantId(tenantId);
        permiso.setUsuarioId(usuario.getId());
        permiso.setRol(PermisoPersonal.RolPersonal.AUDITOR);
        permisoPersonalRepository.save(permiso);

        Empleado nuevo = new Empleado();
        nuevo.setNombreCompleto("No debería crearse");
        nuevo.setDocumentoIdentidad("V-2");
        nuevo.setFechaIngreso(LocalDate.now());

        assertThrows(PersonalAccessService.AccesoPersonalDenegadoException.class,
            () -> empleadoService.crear(tenantId, nuevo));
    }

    @Test
    void rrhhSiPuedeCrearEmpleados() {
        long tenantId = 71006L;
        activarFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        autenticarComo(tenantId, "rrhh71006", "CAJERO_VENDEDOR");
        Usuario usuario = crearUsuario(tenantId, "rrhh71006", Usuario.Rol.CAJERO_VENDEDOR);

        PermisoPersonal permiso = new PermisoPersonal();
        permiso.setTenantId(tenantId);
        permiso.setUsuarioId(usuario.getId());
        permiso.setRol(PermisoPersonal.RolPersonal.RRHH);
        permisoPersonalRepository.save(permiso);

        Empleado nuevo = new Empleado();
        nuevo.setNombreCompleto("Contratado por RRHH");
        nuevo.setDocumentoIdentidad("V-3");
        nuevo.setFechaIngreso(LocalDate.now());

        Empleado guardado = empleadoService.crear(tenantId, nuevo);
        assertNotNull(guardado.getId());
    }
}
