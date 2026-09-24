package com.auroraplus.modules.salud.services;

import com.auroraplus.core.config.CorreoService;
import com.auroraplus.core.mensajeria.WhatsAppCloudApiService;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Antes no existía ningún recordatorio automático de cita — solo el aviso de
 * vencimiento de licencia (ver AvisoVencimientoTrialJob, mismo patrón que se
 * reutiliza acá). Sin esto, el paciente solo se enteraba de su cita el día
 * que la agendó, y la inasistencia (uno de los mayores costos operativos de
 * un consultorio) dependía 100% de que alguien se acordara de llamarlo.
 *
 * Corre una vez al día y envía un correo a cada paciente con cita para
 * MAÑANA (no reenvía — el filtro por fecha exacta hace que cada cita reciba
 * el aviso una sola vez, el día antes). Además, si el negocio configuró Y
 * activó su propia cuenta de WhatsApp Business (ver WhatsAppConfigController
 * / WhatsAppCloudApiService), el mismo recordatorio se manda también por
 * WhatsApp automáticamente — sin eso configurado, el panel "Recordatorios de
 * Mañana" en AgendaMedica.tsx sigue disponible como respaldo manual (enlaces
 * wa.me), para que ningún cliente se quede sin la función mientras consigue
 * su cuenta de Meta.
 */
@Component
public class RecordatorioCitaJob {

    private static final Logger log = LoggerFactory.getLogger(RecordatorioCitaJob.class);

    private static final Set<String> ESTADOS_CON_RECORDATORIO = Set.of("PROGRAMADA", "CONFIRMADA");

    @Autowired
    private CitaMedicaRepository citaMedicaRepository;

    @Autowired
    private CorreoService correoService;

    @Autowired
    private WhatsAppCloudApiService whatsAppCloudApiService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Scheduled(cron = "0 0 8 * * *") // todos los días a las 8:00 am, hora del servidor — igual que AvisoVencimientoTrialJob
    public void enviarRecordatoriosDeMañana() {
        LocalDate fechaObjetivo = LocalDate.now().plusDays(1);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter fmtHora = DateTimeFormatter.ofPattern("hh:mm a", new Locale("es"));

        for (CitaMedica cita : citaMedicaRepository.findByFecha(fechaObjetivo)) {
            if (!ESTADOS_CON_RECORDATORIO.contains(cita.getEstado().name())) continue;
            if (cita.getPaciente() == null) continue;

            String email = cita.getPaciente().getEmail();
            if (email != null && !email.isBlank()) {
                try {
                    String cuerpo = "<p>Hola " + escapar(cita.getPaciente().getNombreCompleto()) + ",</p>"
                        + "<p>Te recordamos tu cita médica programada para <strong>mañana, "
                        + fechaObjetivo.format(fmt) + "</strong> a las <strong>"
                        + cita.getHoraInicio().format(fmtHora) + "</strong>"
                        + (cita.getMedicoNombre() != null && !cita.getMedicoNombre().isBlank() ? " con " + escapar(cita.getMedicoNombre()) : "")
                        + ".</p>"
                        + "<p>Si necesitas reprogramar o cancelar, comunícate con el consultorio a la brevedad.</p>";
                    correoService.enviarHtml(email, "Recordatorio de tu cita médica de mañana", cuerpo);
                } catch (Exception e) {
                    // Un correo fallido no debe tumbar el aviso al resto de los pacientes del día.
                    log.error("No se pudo enviar recordatorio de cita {} al paciente {}: {}",
                        cita.getId(), cita.getPaciente().getId(), e.getMessage(), e);
                }
            }

            enviarRecordatorioWhatsAppSiEstaActivo(cita, fechaObjetivo, fmt, fmtHora);
        }

        enviarRecordatoriosOdontologicos(fechaObjetivo, fmt, fmtHora);
    }

    // La agenda por sillon de odontologia vive en su propia tabla; mismo aviso
    // del dia anterior por correo y, si el negocio lo activo, por WhatsApp.
    private void enviarRecordatoriosOdontologicos(LocalDate fechaObjetivo, DateTimeFormatter fmt, DateTimeFormatter fmtHora) {
        List<Map<String, Object>> citas = jdbcTemplate.queryForList(
            "SELECT c.id, c.tenant_id, c.hora_inicio, c.odontologo, p.id AS paciente_id, " +
            "(p.nombres || ' ' || p.apellidos) AS nombre_paciente, p.email, p.telefono " +
            "FROM salud_odontologia_citas_agenda c JOIN salud_pacientes p ON p.id = c.paciente_id " +
            "WHERE c.fecha_cita = ? AND c.estado IN ('PROGRAMADA', 'CONFIRMADA')",
            fechaObjetivo);

        for (Map<String, Object> c : citas) {
            Long citaId = ((Number) c.get("id")).longValue();
            Long tenantId = ((Number) c.get("tenant_id")).longValue();
            String nombre = (String) c.get("nombre_paciente");
            String odontologo = (String) c.get("odontologo");
            LocalTime hora = ((java.sql.Time) c.get("hora_inicio")).toLocalTime();

            String email = (String) c.get("email");
            if (email != null && !email.isBlank()) {
                try {
                    String cuerpo = "<p>Hola " + escapar(nombre) + ",</p>"
                        + "<p>Te recordamos tu cita odontologica programada para <strong>mañana, "
                        + fechaObjetivo.format(fmt) + "</strong> a las <strong>" + hora.format(fmtHora) + "</strong>"
                        + (odontologo != null && !odontologo.isBlank() ? " con " + escapar(odontologo) : "")
                        + ".</p>"
                        + "<p>Si necesitas reprogramar o cancelar, comunícate con la clínica a la brevedad.</p>";
                    correoService.enviarHtml(email, "Recordatorio de tu cita odontologica de mañana", cuerpo);
                } catch (Exception e) {
                    log.error("No se pudo enviar recordatorio de cita odontologica {} al paciente {}: {}",
                        citaId, c.get("paciente_id"), e.getMessage(), e);
                }
            }

            if (!whatsAppCloudApiService.estaActivoParaTenant(tenantId)) continue;
            String telefono = (String) c.get("telefono");
            String telefonoNormalizado = telefono != null ? telefono.replaceAll("\\D", "") : "";
            if (telefonoNormalizado.isBlank()) continue;
            try {
                whatsAppCloudApiService.enviarPlantilla(tenantId, telefonoNormalizado, List.of(
                    nombre != null ? nombre : "",
                    fechaObjetivo.format(fmt),
                    hora.format(fmtHora)
                ));
                jdbcTemplate.update(
                    "UPDATE salud_odontologia_citas_agenda SET recordatorio_whatsapp_enviado = true WHERE tenant_id = ? AND id = ?",
                    tenantId, citaId);
            } catch (Exception e) {
                log.error("No se pudo enviar recordatorio de WhatsApp de la cita odontologica {} al paciente {}: {}",
                    citaId, c.get("paciente_id"), e.getMessage(), e);
            }
        }
    }

    private void enviarRecordatorioWhatsAppSiEstaActivo(CitaMedica cita, LocalDate fechaObjetivo, DateTimeFormatter fmt, DateTimeFormatter fmtHora) {
        if (!whatsAppCloudApiService.estaActivoParaTenant(cita.getTenantId())) return; // negocio no conectó su WhatsApp — sin esto, el panel manual sigue siendo el respaldo

        String telefono = cita.getPaciente().getTelefono();
        if (telefono == null || telefono.isBlank()) return;
        String telefonoNormalizado = telefono.replaceAll("\\D", ""); // mismo criterio que los enlaces wa.me ya existentes en el frontend
        if (telefonoNormalizado.isBlank()) return;

        try {
            whatsAppCloudApiService.enviarPlantilla(cita.getTenantId(), telefonoNormalizado, List.of(
                cita.getPaciente().getNombreCompleto() != null ? cita.getPaciente().getNombreCompleto() : "",
                fechaObjetivo.format(fmt),
                cita.getHoraInicio().format(fmtHora)
            ));
        } catch (Exception e) {
            // Un envío fallido (ej. plantilla no aprobada, token vencido) no debe tumbar el resto de recordatorios del día.
            log.error("No se pudo enviar recordatorio de WhatsApp de la cita {} al paciente {}: {}",
                cita.getId(), cita.getPaciente().getId(), e.getMessage(), e);
        }
    }

    private String escapar(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
