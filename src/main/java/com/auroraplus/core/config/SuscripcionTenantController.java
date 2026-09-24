package com.auroraplus.core.config;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.PagoSuscripcionTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.PagoSuscripcionTenantRepository;
import com.auroraplus.core.soporte.entities.SaasSoporteMensaje;
import com.auroraplus.core.soporte.entities.SaasSoporteTicket;
import com.auroraplus.core.soporte.repositories.SaasSoporteMensajeRepository;
import com.auroraplus.core.soporte.repositories.SaasSoporteTicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Suscripción vista por el propio negocio: hasta cuándo tiene acceso, si está en prueba y sus
 * pagos confirmados, más el reporte de un pago nuevo. Antes el Hub inventaba todo esto en el
 * navegador (fecha de corte fija, plan "Estándar $35", pago "activado" sin llegar a ningún lado).
 *
 * Está exenta del bloqueo por licencia vencida (ver LicenciaService, módulo "suscripcion"): un
 * negocio vencido tiene que poder ver cuánto debe y reportar su pago para que lo reactiven.
 */
@RestController
@RequestMapping("/api/suscripcion")
public class SuscripcionTenantController {

    @Autowired private LicenciaTenantRepository licenciaRepository;
    @Autowired private PagoSuscripcionTenantRepository pagoRepository;
    @Autowired private SaasSoporteTicketRepository ticketRepository;
    @Autowired private SaasSoporteMensajeRepository mensajeRepository;

    public record PagoVista(Long id, LocalDateTime fecha, BigDecimal monto, String moneda, String metodoPago,
                            String referencia, Integer mesesPagados) {}

    public record EstadoSuscripcion(String nombreEmpresa, String tipoLicencia, String planSolicitado,
                                    LocalDate fechaVencimiento, long diasRestantes, boolean vencida,
                                    boolean enPrueba, List<PagoVista> pagos) {}

    @GetMapping("/estado")
    public EstadoSuscripcion estado() {
        LicenciaTenant licencia = licenciaActual();
        List<PagoVista> pagos = pagoRepository.findByTenantIdOrderByFechaPagoDesc(licencia.getTenantId()).stream()
            .filter(p -> "CONFIRMADO".equals(p.getEstado()))
            .map(p -> new PagoVista(p.getId(), p.getFechaPago(), p.getMonto(), p.getMoneda(), p.getMetodoPago(),
                p.getReferenciaComprobante(), p.getMesesPagados()))
            .toList();
        LocalDate vence = licencia.getFechaVencimientoPago();
        long dias = vence == null ? 0 : ChronoUnit.DAYS.between(LocalDate.now(), vence);
        // "En prueba" = nunca tuvo un pago ni una cortesía registrada y le queda como mucho el
        // período de prueba. Un "acceso total" o un plan regalado por el super admin no es prueba.
        boolean enPrueba = pagos.isEmpty() && dias <= com.auroraplus.core.auth.controllers.AuthController.DIAS_PRUEBA_GRATIS;
        return new EstadoSuscripcion(licencia.getNombreEmpresa(), licencia.getTipoLicencia().name(),
            licencia.getPlanSolicitado(), vence, Math.max(0, dias), vence != null && vence.isBefore(LocalDate.now()),
            enPrueba, pagos);
    }

    public static class ReportePagoRequest {
        public BigDecimal monto;
        public String moneda;
        public String metodo;
        public String referencia;
        public String plan;
        public String nota;
    }

    /**
     * El cliente avisa que pagó. No acredita nada: abre un ticket de soporte de prioridad alta
     * para que el equipo de Aurora verifique el pago y lo registre desde el super admin.
     */
    @PostMapping("/reportar-pago")
    public ResponseEntity<SaasSoporteTicket> reportarPago(@RequestBody ReportePagoRequest req) {
        if (req.referencia == null || req.referencia.isBlank()) {
            throw new RuntimeException("Indica el número de referencia del pago");
        }
        if (req.monto == null || req.monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Indica el monto que pagaste");
        }
        LicenciaTenant licencia = licenciaActual();
        String usuario = AuthContext.getUsername() != null ? AuthContext.getUsername() : "cliente";
        String moneda = req.moneda != null && !req.moneda.isBlank() ? req.moneda.trim() : "USD";

        String detalle = "Pago reportado por el cliente, pendiente de verificación.\n"
            + "Monto: " + req.monto.stripTrailingZeros().toPlainString() + " " + moneda + "\n"
            + "Método: " + (req.metodo != null ? req.metodo : "No indicado") + "\n"
            + "Referencia: " + req.referencia.trim() + "\n"
            + (req.plan != null && !req.plan.isBlank() ? "Plan: " + req.plan.trim() + "\n" : "")
            + (req.nota != null && !req.nota.isBlank() ? "Nota: " + req.nota.trim() + "\n" : "")
            + "Vence: " + licencia.getFechaVencimientoPago();

        SaasSoporteTicket ticket = new SaasSoporteTicket();
        ticket.setTenantId(licencia.getTenantId());
        ticket.setNombreEmpresa(licencia.getNombreEmpresa());
        ticket.setUsuarioCreador(usuario);
        ticket.setTituloAsunto("Pago reportado: " + req.monto.stripTrailingZeros().toPlainString() + " " + moneda
            + " · Ref " + req.referencia.trim());
        ticket.setCategoria("PAGO");
        ticket.setPrioridad("ALTA");
        ticket.setEstado("ABIERTO");
        ticket.setUltimoMensaje(detalle);
        ticket.setFechaCreacion(LocalDateTime.now());
        ticket.setFechaActualizacion(LocalDateTime.now());
        SaasSoporteTicket guardado = ticketRepository.save(ticket);

        SaasSoporteMensaje msg = new SaasSoporteMensaje();
        msg.setTicketId(guardado.getId());
        msg.setEmisorTipo("TENANT");
        msg.setEmisorNombre(usuario);
        msg.setContenido(detalle);
        msg.setFechaEnvio(LocalDateTime.now());
        msg.setLeidoPorDestinatario(false);
        mensajeRepository.save(msg);

        return ResponseEntity.ok(guardado);
    }

    private LicenciaTenant licenciaActual() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio asociado");
        return licenciaRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Negocio no encontrado"));
    }
}
