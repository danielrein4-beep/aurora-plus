package com.auroraplus.core.personal;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.personal.entities.ConceptoNomina;
import com.auroraplus.core.personal.entities.PermisoPersonal;
import com.auroraplus.core.personal.entities.ReglaNominaVersionada;
import com.auroraplus.core.personal.repositories.PermisoPersonalRepository;
import com.auroraplus.core.personal.services.PersonalAccessService;
import com.auroraplus.core.personal.services.ReglaNominaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/** docs/personal-nomina-contract.md §7 — regla por fecha de vigencia, histórico no cambia al editar regla. */
@SpringBootTest
@ActiveProfiles("test")
class ReglaNominaVersionadaTest {

    @Autowired private ReglaNominaService reglaNominaService;
    @Autowired private ModuloTenantRepository moduloTenantRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PermisoPersonalRepository permisoPersonalRepository;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
        AuthContext.clear();
    }

    private void prepararNominaComoRolNomina(long tenantId, String username) {
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
    }

    @Test
    void seAplicaLaReglaVigenteALaFechaDelPeriodoNoLaMasReciente() {
        long tenantId = 72001L;
        prepararNominaComoRolNomina(tenantId, "nomina72001");

        ReglaNominaVersionada v1 = new ReglaNominaVersionada();
        v1.setTipoRegla("PORCENTAJE_DEL_SUELDO");
        v1.setValorNumerico(new BigDecimal("4.0"));
        reglaNominaService.crearNuevaVersion(tenantId, v1, LocalDate.of(2026, 1, 1));

        ReglaNominaVersionada v2 = new ReglaNominaVersionada();
        v2.setTipoRegla("PORCENTAJE_DEL_SUELDO");
        v2.setValorNumerico(new BigDecimal("6.0"));
        reglaNominaService.crearNuevaVersion(tenantId, v2, LocalDate.of(2026, 6, 1));

        Optional<ReglaNominaVersionada> vigenteEnMarzo = reglaNominaService.buscarVigenteEn(tenantId, "PORCENTAJE_DEL_SUELDO", LocalDate.of(2026, 3, 15));
        assertTrue(vigenteEnMarzo.isPresent());
        assertEquals(0, new BigDecimal("4.0").compareTo(vigenteEnMarzo.get().getValorNumerico()));

        Optional<ReglaNominaVersionada> vigenteEnAgosto = reglaNominaService.buscarVigenteEn(tenantId, "PORCENTAJE_DEL_SUELDO", LocalDate.of(2026, 8, 1));
        assertTrue(vigenteEnAgosto.isPresent());
        assertEquals(0, new BigDecimal("6.0").compareTo(vigenteEnAgosto.get().getValorNumerico()));
    }

    @Test
    void editarUnaReglaNoCambiaElHistoricoYaResuelto() {
        long tenantId = 72002L;
        prepararNominaComoRolNomina(tenantId, "nomina72002");

        ReglaNominaVersionada original = new ReglaNominaVersionada();
        original.setTipoRegla("DIAS_VACACIONES_ANUAL");
        original.setValorNumerico(new BigDecimal("15"));
        ReglaNominaVersionada guardadaOriginal = reglaNominaService.crearNuevaVersion(tenantId, original, LocalDate.of(2026, 1, 1));

        // Se "resuelve" la regla vigente en enero (simula lo que haría MotorNominaService al calcular un período de enero).
        Optional<ReglaNominaVersionada> resueltaEnero = reglaNominaService.buscarVigenteEn(tenantId, "DIAS_VACACIONES_ANUAL", LocalDate.of(2026, 1, 15));
        assertEquals(guardadaOriginal.getId(), resueltaEnero.get().getId());

        // Ahora se crea una nueva versión (equivalente a "editar" la regla).
        ReglaNominaVersionada nueva = new ReglaNominaVersionada();
        nueva.setTipoRegla("DIAS_VACACIONES_ANUAL");
        nueva.setValorNumerico(new BigDecimal("18"));
        reglaNominaService.crearNuevaVersion(tenantId, nueva, LocalDate.of(2026, 7, 1));

        // Releyendo la MISMA fila original por su id (lo que ya habría guardado un DetalleNomina
        // como reglaAplicadaId), su valor sigue siendo el de siempre — nunca cambió.
        Optional<ReglaNominaVersionada> mismaFilaReleida = reglaNominaService.buscarVigenteEn(tenantId, "DIAS_VACACIONES_ANUAL", LocalDate.of(2026, 1, 15));
        assertEquals(guardadaOriginal.getId(), mismaFilaReleida.get().getId());
        assertEquals(0, new BigDecimal("15").compareTo(mismaFilaReleida.get().getValorNumerico()),
            "El período histórico de enero no debe verse afectado por la nueva versión creada en julio");
    }

    @Test
    void conceptoActivoSinReglaVigenteNoInventaUnValor() {
        long tenantId = 72003L;
        prepararNominaComoRolNomina(tenantId, "nomina72003");

        ConceptoNomina concepto = new ConceptoNomina();
        concepto.setCodigo("SSO");
        concepto.setNombre("Seguro Social Obligatorio");
        concepto.setTipo(ConceptoNomina.Tipo.DEDUCCION);
        ConceptoNomina guardado = reglaNominaService.crearConcepto(tenantId, concepto);

        Optional<ReglaNominaVersionada> vigente = reglaNominaService.buscarVigenteEnPorConcepto(tenantId, guardado.getId(), LocalDate.now());
        assertTrue(vigente.isEmpty(), "Sin una ReglaNominaVersionada creada explícitamente, no debe existir una regla 'por defecto'");
    }
}
