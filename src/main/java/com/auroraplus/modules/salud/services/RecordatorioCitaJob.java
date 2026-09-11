package com.auroraplus.modules.salud.services;

import com.auroraplus.core.config.CorreoService;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
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
 * el aviso una sola vez, el día antes). El recordatorio por WhatsApp sigue
 * siendo manual (ver panel "Recordatorios de Mañana" en AgendaMedica.tsx):
 * no hay integración con la API de WhatsApp Business, solo enlaces wa.me que
 * requiere que la secretaria los dispare a mano.
 */
@Component
public class RecordatorioCitaJob {

    private static final Logger log = LoggerFactory.getLogger(RecordatorioCitaJob.class);

    private static final Set<String> ESTADOS_CON_RECORDATORIO = Set.of("PROGRAMADA", "CONFIRMADA");

    @Autowired
    private CitaMedicaRepository citaMedicaRepository;

    @Autowired
    private CorreoService correoService;

    @Scheduled(cron = "0 0 8 * * *") // todos los días a las 8:00 am, hora del servidor — igual que AvisoVencimientoTrialJob
    public void enviarRecordatoriosDeMañana() {
        LocalDate fechaObjetivo = LocalDate.now().plusDays(1);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter fmtHora = DateTimeFormatter.ofPattern("hh:mm a", new Locale("es"));

        for (CitaMedica cita : citaMedicaRepository.findByFecha(fechaObjetivo)) {
            if (!ESTADOS_CON_RECORDATORIO.contains(cita.getEstado().name())) continue;
            if (cita.getPaciente() == null) continue;

            String email = cita.getPaciente().getEmail();
            if (email == null || email.isBlank()) continue;

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
    }

    private String escapar(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
