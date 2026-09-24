package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.CorreoService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Antes, una cuenta por cobrar/pagar vencida solo se notaba si el dueño
 * entraba a Administración > Cuentas por Cobrar & Pagar a mirar — mismo
 * problema que resolvió RecordatorioCitaJob para las citas médicas, mismo
 * patrón acá. Corre una vez al día y manda UN correo consolidado al dueño
 * (no uno por cuenta) listando lo vencido y lo por vencer en los próximos 3
 * días, agrupado por tenant.
 *
 * Por qué solo correo (no WhatsApp, a diferencia de RecordatorioCitaJob): el
 * envío business-initiated de WhatsApp fuera de la ventana de 24h exige una
 * plantilla ya aprobada por Meta con el texto exacto de esa plantilla — la
 * que cada tenant configura es para recordatorio de citas, reusarla acá
 * enviaría el mensaje equivocado dentro de un formato que no le pertenece.
 * Si en el futuro un tenant configura una plantilla específica de cobranza,
 * ahí se puede sumar el envío por WhatsApp con el mismo criterio.
 */
@Component
public class RecordatorioCobroJob {

    private static final Logger log = LoggerFactory.getLogger(RecordatorioCobroJob.class);

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CorreoService correoService;

    @Scheduled(cron = "0 30 8 * * *") // todos los días a las 8:30 am, después del aviso de citas
    public void enviarRecordatoriosDeCobro() {
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(3);

        List<MovimientoCaja> cxc = movimientoCajaRepository.findPendientesConVencimientoHasta(MovimientoCaja.TipoMovimiento.CXC, limite);
        if (cxc.isEmpty()) return;

        Map<Long, List<MovimientoCaja>> porTenant = cxc.stream().collect(Collectors.groupingBy(MovimientoCaja::getTenantId));

        for (Map.Entry<Long, List<MovimientoCaja>> entrada : porTenant.entrySet()) {
            try {
                enviarResumenTenant(entrada.getKey(), entrada.getValue(), hoy);
            } catch (Exception e) {
                // Un tenant con correo mal configurado no debe tumbar el aviso del resto.
                log.error("No se pudo enviar el recordatorio de cobro del tenant {}: {}", entrada.getKey(), e.getMessage(), e);
            }
        }
    }

    private void enviarResumenTenant(Long tenantId, List<MovimientoCaja> cuentas, LocalDate hoy) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null || licencia.getEmailContacto() == null || licencia.getEmailContacto().isBlank()) return;

        List<MovimientoCaja> vencidas = cuentas.stream().filter(c -> c.getFechaVencimiento().isBefore(hoy)).toList();
        List<MovimientoCaja> porVencer = cuentas.stream().filter(c -> !c.getFechaVencimiento().isBefore(hoy)).toList();

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        StringBuilder filas = new StringBuilder();
        for (MovimientoCaja c : vencidas) filas.append(filaHtml(c, fmt, "#dc2626", "Vencida"));
        for (MovimientoCaja c : porVencer) filas.append(filaHtml(c, fmt, "#d97706", "Por vencer"));

        String cuerpo = "<div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;'>"
            + "<h2 style='color:#111;'>Cuentas por cobrar que necesitan tu atención</h2>"
            + "<p style='color:#555;'>" + vencidas.size() + " vencida(s) y " + porVencer.size() + " por vencer en los próximos 3 días.</p>"
            + "<table style='width:100%;border-collapse:collapse;margin:12px 0;'>"
            + "<tr style='text-align:left;font-size:12px;color:#888;'><th>Cliente</th><th>Monto</th><th>Vence</th><th>Estado</th></tr>"
            + filas
            + "</table>"
            + "<p style='color:#999;font-size:12px;'>Revisa el detalle completo en Administración &gt; Cuentas por Cobrar &amp; Pagar. Este es un aviso automático de Aurora Plus.</p>"
            + "</div>";

        correoService.enviarHtml(licencia.getEmailContacto(), "Cuentas por cobrar: " + vencidas.size() + " vencida(s)", cuerpo);
    }

    private String filaHtml(MovimientoCaja c, DateTimeFormatter fmt, String color, String etiqueta) {
        String cliente = extraerNombreCliente(c.getConcepto());
        return "<tr style='border-top:1px solid #eee;font-size:13px;'>"
            + "<td style='padding:6px 4px;'>" + cliente + "</td>"
            + "<td style='padding:6px 4px;'>" + c.getSaldoPendiente() + " " + c.getMoneda() + "</td>"
            + "<td style='padding:6px 4px;'>" + c.getFechaVencimiento().format(fmt) + "</td>"
            + "<td style='padding:6px 4px;color:" + color + ";font-weight:bold;'>" + etiqueta + "</td>"
            + "</tr>";
    }

    // Mismo criterio de parseo que movimientoACuenta en el frontend (ComercioApp.tsx) —
    // el nombre del cliente/proveedor vive dentro del texto de concepto, no en un campo propio.
    private String extraerNombreCliente(String concepto) {
        String marcador = "— Cliente: ";
        int idx = concepto.lastIndexOf(marcador);
        return idx >= 0 ? concepto.substring(idx + marcador.length()) : concepto;
    }
}
