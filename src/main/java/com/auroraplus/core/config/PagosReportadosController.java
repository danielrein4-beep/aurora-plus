package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.PagoSuscripcionTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.soporte.entities.SaasSoporteMensaje;
import com.auroraplus.core.soporte.entities.SaasSoporteTicket;
import com.auroraplus.core.soporte.repositories.SaasSoporteMensajeRepository;
import com.auroraplus.core.soporte.repositories.SaasSoporteTicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bandeja de pagos que los clientes reportaron desde Aurora Hub (tickets de soporte categoría
 * PAGO). El equipo los verifica contra el banco y, con un clic, registra el pago (acredita el
 * tiempo) y cierra el reporte; o lo rechaza con un motivo que le llega al cliente.
 *
 * Vive bajo /tenants/pagos… para que el rol FINANZAS tenga acceso (ver PermisosSuperAdmin).
 */
@RestController
@RequestMapping("/api/super-admin/tenants/pagos-reportados")
public class PagosReportadosController {

    @Autowired private SaasSoporteTicketRepository ticketRepository;
    @Autowired private SaasSoporteMensajeRepository mensajeRepository;
    @Autowired private LicenciaTenantRepository licenciaRepository;
    @Autowired private SuperAdminController superAdminController;

    public record PagoReportado(Long ticketId, Long tenantId, String nombreEmpresa, String usuario, LocalDateTime fecha,
                                BigDecimal monto, String moneda, String metodo, String referencia, String plan, String nota,
                                String estado, LocalDate fechaVencimiento, boolean vencida) {}

    @GetMapping
    public List<PagoReportado> pendientes() {
        return ticketRepository.findByCategoriaAndEstadoInOrderByFechaCreacionAsc("PAGO", LicenciaService.ESTADOS_PAGO_PENDIENTE)
            .stream().map(this::aVista).toList();
    }

    public static class VerificarRequest {
        public BigDecimal monto;
        public String moneda;
        public String metodoPago;
        public String referencia;
        public Integer meses;
        public Integer dias;
        public String notas;
    }

    /** Pago confirmado en el banco: se registra (acredita el tiempo y reactiva) y se cierra el reporte. */
    @PostMapping("/{ticketId:[0-9]+}/verificar")
    @Transactional
    public ResponseEntity<PagoSuscripcionTenant> verificar(@PathVariable Long ticketId, @RequestBody VerificarRequest req) {
        SaasSoporteTicket ticket = ticketPendiente(ticketId);
        PagoReportado rep = aVista(ticket);

        SuperAdminController.RegistrarPagoRequest pago = new SuperAdminController.RegistrarPagoRequest();
        pago.tenantId = ticket.getTenantId();
        pago.monto = req.monto != null ? req.monto : rep.monto();
        if (pago.monto == null || pago.monto.signum() <= 0) throw new RuntimeException("Indica el monto verificado");
        pago.moneda = texto(req.moneda) ? req.moneda : rep.moneda();
        pago.metodoPago = texto(req.metodoPago) ? req.metodoPago : rep.metodo();
        pago.referenciaComprobante = texto(req.referencia) ? req.referencia : rep.referencia();
        pago.meses = req.meses;
        pago.dias = req.dias;
        pago.notas = (texto(req.notas) ? req.notas.trim() + " · " : "") + "Verificado desde el reporte #" + ticketId;
        PagoSuscripcionTenant guardado = superAdminController.registrarPago(pago).getBody();

        LicenciaTenant licencia = licenciaRepository.findByTenantId(ticket.getTenantId()).orElse(null);
        String vence = licencia != null && licencia.getFechaVencimientoPago() != null ? " Tu plan queda vigente hasta el "
            + licencia.getFechaVencimientoPago() + "." : "";
        cerrar(ticket, "Pago verificado. Ya puedes descargar tu recibo en Aurora Hub > Facturación & Pagos." + vence);
        return ResponseEntity.ok(guardado);
    }

    /** El pago no aparece en el banco o no coincide: se cierra el reporte con el motivo. */
    @PostMapping("/{ticketId:[0-9]+}/rechazar")
    @Transactional
    public ResponseEntity<java.util.Map<String, Object>> rechazar(@PathVariable Long ticketId, @RequestBody java.util.Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        if (!texto(motivo)) throw new RuntimeException("Indica el motivo del rechazo");
        SaasSoporteTicket ticket = ticketPendiente(ticketId);
        cerrar(ticket, "No pudimos verificar tu pago: " + motivo.trim()
            + ". Si crees que es un error, responde este mensaje o reporta el pago de nuevo con la referencia correcta.");
        return ResponseEntity.ok(java.util.Map.of("rechazado", true));
    }

    private SaasSoporteTicket ticketPendiente(Long ticketId) {
        SaasSoporteTicket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Reporte de pago no encontrado"));
        if (!"PAGO".equals(ticket.getCategoria())) throw new RuntimeException("Ese ticket no es un reporte de pago");
        if (!LicenciaService.ESTADOS_PAGO_PENDIENTE.contains(ticket.getEstado())) {
            throw new RuntimeException("Este reporte ya fue revisado");
        }
        return ticket;
    }

    private void cerrar(SaasSoporteTicket ticket, String mensaje) {
        String agente = com.auroraplus.core.auth.AuthContext.getUsername();
        SaasSoporteMensaje msg = new SaasSoporteMensaje();
        msg.setTicketId(ticket.getId());
        msg.setEmisorTipo("SUPERADMIN");
        msg.setEmisorNombre("Pagos Aurora");
        msg.setContenido(mensaje);
        msg.setFechaEnvio(LocalDateTime.now());
        msg.setLeidoPorDestinatario(false);
        mensajeRepository.save(msg);

        ticket.setEstado("RESUELTO");
        ticket.setUltimoMensaje(mensaje);
        ticket.setAgenteAsignado(agente != null ? agente : "Pagos Aurora");
        ticket.setFechaActualizacion(LocalDateTime.now());
        ticketRepository.save(ticket);
    }

    /** Los datos del reporte salen del primer mensaje del cliente (ver SuscripcionTenantController.reportarPago). */
    private PagoReportado aVista(SaasSoporteTicket t) {
        String detalle = mensajeRepository.findByTicketIdOrderByFechaEnvioAsc(t.getId()).stream()
            .filter(m -> "TENANT".equals(m.getEmisorTipo()))
            .map(SaasSoporteMensaje::getContenido).findFirst()
            .orElse(t.getUltimoMensaje() != null ? t.getUltimoMensaje() : "");
        BigDecimal monto = null;
        String moneda = null;
        Matcher m = Pattern.compile("(?m)^Monto: ([0-9.]+)\\s*(\\S*)").matcher(detalle);
        if (m.find()) {
            try { monto = new BigDecimal(m.group(1)); } catch (NumberFormatException ignored) { /* queda null */ }
            moneda = m.group(2).isBlank() ? null : m.group(2);
        }
        LicenciaTenant licencia = licenciaRepository.findByTenantId(t.getTenantId()).orElse(null);
        LocalDate vence = licencia != null ? licencia.getFechaVencimientoPago() : null;
        return new PagoReportado(t.getId(), t.getTenantId(), t.getNombreEmpresa(), t.getUsuarioCreador(), t.getFechaCreacion(),
            monto, moneda != null ? moneda : "USD", campo(detalle, "Método"), campo(detalle, "Referencia"),
            campo(detalle, "Plan"), campo(detalle, "Nota"), t.getEstado(), vence, vence != null && vence.isBefore(LocalDate.now()));
    }

    private static String campo(String detalle, String nombre) {
        Matcher m = Pattern.compile("(?m)^" + nombre + ": (.*)$").matcher(detalle);
        return m.find() ? m.group(1).trim() : null;
    }

    private static boolean texto(String s) {
        return s != null && !s.isBlank();
    }
}
