package com.auroraplus.core.notificaciones;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.notificaciones.entities.AlertaAdmin;
import com.auroraplus.core.notificaciones.repositories.AlertaAdminRepository;
import com.auroraplus.core.notificaciones.services.AlertaVencimientoCuentasJob;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Mismo criterio de AvisoVencimientoTrialJob: coincidencia EXACTA de fecha, no un rango — el
 * job corre una vez al día, así que solo debe avisar el día justo en que corresponde.
 */
@SpringBootTest
@ActiveProfiles("test")
class AlertaVencimientoCuentasJobTest {

    @Autowired
    private AlertaVencimientoCuentasJob job;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private AlertaAdminRepository alertaAdminRepository;

    @Test
    void avisaPorVencerSoloExactamenteALosCincoDias() {
        long tenantId = 93001L;
        LocalDate hoy = LocalDate.now();

        MovimientoCaja porVencerHoy = crearCxc(tenantId, hoy.plusDays(5), "PENDIENTE");
        crearCxc(tenantId, hoy.plusDays(4), "PENDIENTE"); // todavía no le toca
        crearCxc(tenantId, hoy.plusDays(6), "PENDIENTE"); // ya pasó su turno de aviso

        job.avisarVencimientosProximosYVencidos();

        List<AlertaAdmin> alertas = alertaAdminRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId);
        List<AlertaAdmin> porVencer = alertas.stream().filter(a -> a.getTipo() == AlertaAdmin.Tipo.CUENTA_POR_VENCER).toList();
        assertEquals(1, porVencer.size(), "Solo la cuenta que vence en exactamente 5 días debe generar aviso");
        assertEquals(porVencerHoy.getId(), porVencer.get(0).getReferenciaId());
    }

    @Test
    void avisaVencidaElDiaDespuesDelVencimiento() {
        long tenantId = 93002L;
        LocalDate hoy = LocalDate.now();

        MovimientoCaja vencidaAyer = crearCxp(tenantId, hoy.minusDays(1), "PENDIENTE");
        crearCxp(tenantId, hoy.minusDays(2), "PENDIENTE"); // ya pasó su único día de aviso
        crearCxp(tenantId, hoy, "PENDIENTE"); // vence hoy, todavía no está vencida

        job.avisarVencimientosProximosYVencidos();

        List<AlertaAdmin> alertas = alertaAdminRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId);
        List<AlertaAdmin> vencidas = alertas.stream().filter(a -> a.getTipo() == AlertaAdmin.Tipo.CUENTA_VENCIDA).toList();
        assertEquals(1, vencidas.size());
        assertEquals(vencidaAyer.getId(), vencidas.get(0).getReferenciaId());
    }

    @Test
    void noAvisaCuentasYaPagadasNiSinFechaPactada() {
        long tenantId = 93003L;
        LocalDate hoy = LocalDate.now();

        crearCxc(tenantId, hoy.plusDays(5), "PAGADO"); // ya se pagó, aunque la fecha coincida
        MovimientoCaja sinPlazo = crearCxc(tenantId, null, "PENDIENTE");

        job.avisarVencimientosProximosYVencidos();

        assertTrue(alertaAdminRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId).isEmpty());
        assertNull(sinPlazo.getFechaVencimiento());
    }

    private MovimientoCaja crearCxc(long tenantId, LocalDate fechaVencimiento, String estado) {
        return guardar(tenantId, MovimientoCaja.TipoMovimiento.CXC, fechaVencimiento, estado);
    }

    private MovimientoCaja crearCxp(long tenantId, LocalDate fechaVencimiento, String estado) {
        return guardar(tenantId, MovimientoCaja.TipoMovimiento.CXP, fechaVencimiento, estado);
    }

    private MovimientoCaja guardar(long tenantId, MovimientoCaja.TipoMovimiento tipo, LocalDate fechaVencimiento, String estado) {
        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setTenantId(tenantId);
        movimiento.setTipo(tipo);
        movimiento.setMonto(new BigDecimal("100.00"));
        movimiento.setMoneda("USD");
        movimiento.setConcepto("Cuenta de prueba");
        movimiento.setSaldoPendiente(new BigDecimal("100.00"));
        movimiento.setEstado(estado);
        movimiento.setFechaVencimiento(fechaVencimiento);
        return movimientoCajaRepository.save(movimiento);
    }
}
