package com.auroraplus.core.notificaciones.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.notificaciones.entities.AlertaAdmin;
import com.auroraplus.core.notificaciones.repositories.AlertaAdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Alertas de vencimiento de CXC (fiado a clientes) y CXP (crédito de proveedores) —
 * MovimientoCaja.fechaVencimiento. Mismo criterio que AvisoVencimientoTrialJob: corre una vez
 * al día y avisa por coincidencia EXACTA de fecha, así que cada cuenta genera como máximo dos
 * alertas en su vida (una al acercarse el vencimiento, otra al día siguiente de vencer) — no
 * reenvía a diario mientras siga pendiente.
 *
 * Solo cuentas con fechaVencimiento informada (§ ver MovimientoCaja) — una CXC/CXP sin plazo
 * pactado no genera alerta, no se le inventa fecha.
 */
@Component
public class AlertaVencimientoCuentasJob {

    private static final Logger log = LoggerFactory.getLogger(AlertaVencimientoCuentasJob.class);
    private static final int DIAS_ANTES_DEL_AVISO = 5;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private AlertaAdminRepository alertaAdminRepository;

    @Scheduled(cron = "0 0 7 * * *") // todos los días a las 7:00 am, hora del servidor
    public void avisarVencimientosProximosYVencidos() {
        LocalDate hoy = LocalDate.now();

        avisar(MovimientoCaja.TipoMovimiento.CXC, hoy.plusDays(DIAS_ANTES_DEL_AVISO), AlertaAdmin.Tipo.CUENTA_POR_VENCER,
            "Cuenta por cobrar", " vence en " + DIAS_ANTES_DEL_AVISO + " días");
        avisar(MovimientoCaja.TipoMovimiento.CXP, hoy.plusDays(DIAS_ANTES_DEL_AVISO), AlertaAdmin.Tipo.CUENTA_POR_VENCER,
            "Cuenta por pagar", " vence en " + DIAS_ANTES_DEL_AVISO + " días");

        avisar(MovimientoCaja.TipoMovimiento.CXC, hoy.minusDays(1), AlertaAdmin.Tipo.CUENTA_VENCIDA,
            "Cuenta por cobrar", " venció ayer y sigue pendiente");
        avisar(MovimientoCaja.TipoMovimiento.CXP, hoy.minusDays(1), AlertaAdmin.Tipo.CUENTA_VENCIDA,
            "Cuenta por pagar", " venció ayer y sigue pendiente");
    }

    private void avisar(MovimientoCaja.TipoMovimiento tipo, LocalDate fechaObjetivo, AlertaAdmin.Tipo tipoAlerta,
                         String etiqueta, String sufijoMensaje) {
        List<MovimientoCaja> cuentas = movimientoCajaRepository.findByTipoAndEstadoAndFechaVencimiento(tipo, "PENDIENTE", fechaObjetivo);
        for (MovimientoCaja cuenta : cuentas) {
            try {
                AlertaAdmin alerta = new AlertaAdmin();
                alerta.setTenantId(cuenta.getTenantId());
                alerta.setTipo(tipoAlerta);
                alerta.setReferenciaId(cuenta.getId());
                alerta.setMensaje(etiqueta + " de " + cuenta.getMonto() + " " + cuenta.getMoneda()
                    + " (\"" + cuenta.getConcepto() + "\")" + sufijoMensaje + ".");
                alertaAdminRepository.save(alerta);
            } catch (Exception e) {
                // Una alerta fallida no debe tumbar el resto del barrido del día.
                log.error("No se pudo crear alerta de vencimiento para movimiento {}: {}", cuenta.getId(), e.getMessage(), e);
            }
        }
    }
}
