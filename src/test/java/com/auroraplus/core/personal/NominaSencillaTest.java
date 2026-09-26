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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Nómina cómoda del dueño (NominaSencillaService): sueldo por frecuencia, revisar con bono y
 * descuento, pagar con egreso en caja, y no pagar dos veces las mismas fechas.
 */
@SpringBootTest
@ActiveProfiles("test")
class NominaSencillaTest {

    @Autowired private NominaSencillaService nominaSencillaService;
    @Autowired private MotorNominaService motorNominaService;
    @Autowired private ModuloTenantRepository moduloTenantRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;

    // Una semana cualquiera, de lunes a domingo.
    private static final LocalDate LUNES = LocalDate.of(2026, 8, 3);
    private static final LocalDate DOMINGO = LocalDate.of(2026, 8, 9);

    @AfterEach
    void limpiar() {
        TenantContext.clear();
        AuthContext.clear();
    }

    private void prepararDueno(long tenantId) {
        ModuloTenant modulo = new ModuloTenant();
        modulo.setTenantId(tenantId);
        modulo.setModuloNombre(PersonalAccessService.FLAG_PERSONAL);
        modulo.setActivo(true);
        moduloTenantRepository.save(modulo);
        String username = "dueno" + tenantId;
        Usuario u = new Usuario();
        u.setTenantId(tenantId);
        u.setUsername(username);
        u.setPasswordHash("x");
        u.setRol(Usuario.Rol.DUENO_ADMIN);
        usuarioRepository.save(u);
        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set(username, "DUENO_ADMIN");
    }

    private Empleado trabajador(long tenantId, String nombre) {
        Empleado e = new Empleado();
        e.setTenantId(tenantId);
        e.setNombreCompleto(nombre);
        e.setDocumentoIdentidad("V-" + System.nanoTime());
        e.setFechaIngreso(LocalDate.of(2026, 1, 1));
        return empleadoRepository.save(e);
    }

    @Test
    void semanalConBonoYDescuentoSePagaUnaSolaVez() {
        long tenantId = 94701L;
        prepararDueno(tenantId);
        Empleado semanal = trabajador(tenantId, "Ana Semanal");
        Empleado quincenal = trabajador(tenantId, "Luis Quincenal");
        nominaSencillaService.ponerSueldo(tenantId, semanal.getId(),
            new NominaSencillaService.SueldoRequest("cajera", "FIJO_MENSUAL", new BigDecimal("300"), "USD", "SEMANAL"));
        nominaSencillaService.ponerSueldo(tenantId, quincenal.getId(),
            new NominaSencillaService.SueldoRequest("Cajera", "FIJO_MENSUAL", new BigDecimal("600"), "USD", "QUINCENAL"));

        PeriodoNomina periodo = nominaSencillaService.preparar(tenantId, "SEMANAL", LUNES, DOMINGO);
        List<NominaEmpleado> recibos = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId());
        assertEquals(1, recibos.size(), "En la nómina semanal solo entra quien cobra semanal");
        NominaEmpleado recibo = recibos.get(0);
        assertEquals(semanal.getId(), recibo.getEmpleadoId());
        assertEquals(0, new BigDecimal("70.00").compareTo(recibo.getNetoAPagar()), "Semana de un sueldo de 300 al mes: 300 x 7 / 30");

        NominaEmpleado revisado = motorNominaService.recalcularRecibo(tenantId, recibo.getId(),
            new MotorNominaService.AjusteRevision(null, null, new BigDecimal("10"), new BigDecimal("5"), "Adelanto del martes"));
        assertEquals(0, new BigDecimal("75.00").compareTo(revisado.getNetoAPagar()), "70 + 10 de bono - 5 de descuento");

        // Retomar las mismas fechas no duplica la nómina.
        assertEquals(periodo.getId(), nominaSencillaService.preparar(tenantId, "SEMANAL", LUNES, DOMINGO).getId());

        nominaSencillaService.pagar(tenantId, periodo.getId());
        NominaEmpleado pagado = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, recibo.getId()).orElseThrow();
        assertEquals(NominaEmpleado.Estado.PAGADA, pagado.getEstado());
        assertNotNull(pagado.getMovimientoCajaId(), "El pago sale de caja");

        NominaSencillaService.ReciboImprimible impreso = nominaSencillaService.recibo(tenantId, recibo.getId());
        assertEquals("Ana Semanal", impreso.trabajador());
        assertEquals("Cajera", impreso.cargo(), "El cargo se reutiliza sin importar mayúsculas");
        assertEquals(3, impreso.lineas().size(), "Sueldo, bono y descuento");

        assertThrows(RuntimeException.class, () -> nominaSencillaService.preparar(tenantId, "SEMANAL", LUNES, DOMINGO),
            "Las fechas ya pagadas no se vuelven a pagar");
        assertThrows(RuntimeException.class, () -> nominaSencillaService.pagar(tenantId, periodo.getId()));
    }

    @Test
    void jornalSePagaPorJornadasYElDuenoPuedeCorregirlas() {
        long tenantId = 94702L;
        prepararDueno(tenantId);
        Empleado obrero = trabajador(tenantId, "Pedro Obrero");
        nominaSencillaService.ponerSueldo(tenantId, obrero.getId(),
            new NominaSencillaService.SueldoRequest("Obrero", "POR_JORNADA", new BigDecimal("10"), "USD", "SEMANAL"));

        PeriodoNomina periodo = nominaSencillaService.preparar(tenantId, "SEMANAL", LUNES, DOMINGO);
        NominaEmpleado recibo = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).get(0);
        assertEquals(0, new BigDecimal("70.00").compareTo(recibo.getNetoAPagar()), "Sin marcaje se proponen los 7 días");

        NominaEmpleado corregido = motorNominaService.recalcularRecibo(tenantId, recibo.getId(),
            new MotorNominaService.AjusteRevision(new BigDecimal("5"), null, null, null, null));
        assertEquals(0, new BigDecimal("50.00").compareTo(corregido.getNetoAPagar()), "5 jornadas de 10");

        assertThrows(RuntimeException.class, () -> motorNominaService.recalcularRecibo(tenantId, recibo.getId(),
            new MotorNominaService.AjusteRevision(null, null, null, new BigDecimal("80"), null)),
            "Un descuento mayor que lo que cobra se rechaza");

        nominaSencillaService.descartar(tenantId, periodo.getId());
        assertTrue(nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).isEmpty());
    }

    @Test
    void sinNadieQueCobreEnEsaFrecuenciaNoQuedaUnPeriodoVacio() {
        long tenantId = 94703L;
        prepararDueno(tenantId);
        Empleado e = trabajador(tenantId, "Solo Mensual");
        nominaSencillaService.ponerSueldo(tenantId, e.getId(),
            new NominaSencillaService.SueldoRequest("Médico", "FIJO_MENSUAL", new BigDecimal("1000"), "USD", "MENSUAL"));
        assertThrows(RuntimeException.class, () -> nominaSencillaService.preparar(tenantId, "SEMANAL", LUNES, DOMINGO));

        PeriodoNomina mes = nominaSencillaService.preparar(tenantId, "MENSUAL", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));
        NominaEmpleado recibo = nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, mes.getId()).get(0);
        assertEquals(0, new BigDecimal("1000.00").compareTo(recibo.getNetoAPagar()), "El mes completo paga el sueldo entero");
    }
}
