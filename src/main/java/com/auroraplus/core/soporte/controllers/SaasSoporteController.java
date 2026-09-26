package com.auroraplus.core.soporte.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.soporte.entities.SaasSoporteMensaje;
import com.auroraplus.core.soporte.entities.SaasSoporteTicket;
import com.auroraplus.core.soporte.repositories.SaasSoporteMensajeRepository;
import com.auroraplus.core.soporte.repositories.SaasSoporteTicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class SaasSoporteController {

    @Autowired
    private SaasSoporteTicketRepository ticketRepository;

    @Autowired
    private SaasSoporteMensajeRepository mensajeRepository;

    @Autowired
    private LicenciaTenantRepository licenciaRepository;

    // =========================================================================
    // ENDPOINTS SUPER ADMIN (/api/super-admin/soporte/**)
    // =========================================================================

    @GetMapping("/api/super-admin/soporte/tickets")
    public List<Map<String, Object>> listarTicketsSuperAdmin(
        @RequestParam(required = false) String estado,
        @RequestParam(required = false) String prioridad,
        @RequestParam(required = false) String q
    ) {
        List<SaasSoporteTicket> tickets = ticketRepository.findAllByOrderByFechaActualizacionDesc();

        return tickets.stream()
            .filter(t -> estado == null || estado.equalsIgnoreCase("TODOS") || t.getEstado().equalsIgnoreCase(estado))
            .filter(t -> prioridad == null || prioridad.equalsIgnoreCase("TODOS") || t.getPrioridad().equalsIgnoreCase(prioridad))
            .filter(t -> {
                if (q == null || q.trim().isEmpty()) return true;
                String query = q.toLowerCase();
                return t.getNombreEmpresa().toLowerCase().contains(query)
                    || t.getTituloAsunto().toLowerCase().contains(query)
                    || (t.getUltimoMensaje() != null && t.getUltimoMensaje().toLowerCase().contains(query));
            })
            .map(t -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", t.getId());
                map.put("tenantId", t.getTenantId());
                map.put("nombreEmpresa", t.getNombreEmpresa());
                map.put("usuarioCreador", t.getUsuarioCreador());
                map.put("tituloAsunto", t.getTituloAsunto());
                map.put("categoria", t.getCategoria());
                map.put("prioridad", t.getPrioridad());
                map.put("estado", t.getEstado());
                map.put("agenteAsignado", t.getAgenteAsignado());
                map.put("ultimoMensaje", t.getUltimoMensaje());
                map.put("fechaCreacion", t.getFechaCreacion().toString());
                map.put("fechaActualizacion", t.getFechaActualizacion().toString());
                long noLeidos = mensajeRepository.countByTicketIdAndEmisorTipoAndLeidoPorDestinatarioFalse(t.getId(), "TENANT");
                map.put("mensajesNoLeidos", noLeidos);
                return map;
            })
            .collect(Collectors.toList());
    }

    @GetMapping("/api/super-admin/soporte/tickets/{id:[0-9]+}/mensajes")
    public List<SaasSoporteMensaje> listarMensajesSuperAdmin(@PathVariable Long id) {
        List<SaasSoporteMensaje> msgs = mensajeRepository.findByTicketIdOrderByFechaEnvioAsc(id);
        // Marcar como leidos los mensajes que envió el tenant
        for (SaasSoporteMensaje m : msgs) {
            if ("TENANT".equalsIgnoreCase(m.getEmisorTipo()) && !m.isLeidoPorDestinatario()) {
                m.setLeidoPorDestinatario(true);
                mensajeRepository.save(m);
            }
        }
        return msgs;
    }

    @PostMapping("/api/super-admin/soporte/tickets/{id:[0-9]+}/mensajes")
    public ResponseEntity<SaasSoporteMensaje> enviarMensajeSuperAdmin(
        @PathVariable Long id,
        @RequestBody Map<String, String> body
    ) {
        SaasSoporteTicket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        String contenido = body.get("contenido");
        if (contenido == null || contenido.trim().isEmpty()) {
            throw new RuntimeException("El mensaje no puede estar vacio");
        }

        String agente = body.getOrDefault("agenteNombre", "Soporte Aurora");

        SaasSoporteMensaje msg = new SaasSoporteMensaje();
        msg.setTicketId(id);
        msg.setEmisorTipo("SUPERADMIN");
        msg.setEmisorNombre(agente);
        msg.setContenido(contenido.trim());
        msg.setFechaEnvio(LocalDateTime.now());
        msg.setLeidoPorDestinatario(false);
        SaasSoporteMensaje guardado = mensajeRepository.save(msg);

        // Actualizar ticket
        ticket.setUltimoMensaje(contenido.trim());
        ticket.setFechaActualizacion(LocalDateTime.now());
        if ("ABIERTO".equalsIgnoreCase(ticket.getEstado())) {
            ticket.setEstado("EN_ATENCION");
        }
        ticket.setAgenteAsignado(agente);
        ticketRepository.save(ticket);

        return ResponseEntity.ok(guardado);
    }

    @PutMapping("/api/super-admin/soporte/tickets/{id:[0-9]+}/estado")
    public ResponseEntity<SaasSoporteTicket> cambiarEstadoTicket(
        @PathVariable Long id,
        @RequestBody Map<String, String> body
    ) {
        SaasSoporteTicket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        String nuevoEstado = body.get("estado");
        if (nuevoEstado != null && !nuevoEstado.trim().isEmpty()) {
            ticket.setEstado(nuevoEstado.toUpperCase().trim());
        }

        String agente = body.get("agenteAsignado");
        if (agente != null && !agente.trim().isEmpty()) {
            ticket.setAgenteAsignado(agente.trim());
        }

        ticket.setFechaActualizacion(LocalDateTime.now());
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    // =========================================================================
    // ENDPOINTS TENANT (/api/tenant/soporte/**)
    // =========================================================================

    @GetMapping("/api/tenant/soporte/tickets")
    public List<Map<String, Object>> listarTicketsTenant() {
        Long tid = TenantContext.getCurrentTenant();
        if (tid == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }

        List<SaasSoporteTicket> tickets = ticketRepository.findByTenantIdOrderByFechaActualizacionDesc(tid);
        final Long finalTid = tid;
        return tickets.stream().map(t -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", t.getId());
            map.put("tenantId", t.getTenantId());
            map.put("nombreEmpresa", t.getNombreEmpresa());
            map.put("usuarioCreador", t.getUsuarioCreador());
            map.put("tituloAsunto", t.getTituloAsunto());
            map.put("categoria", t.getCategoria());
            map.put("prioridad", t.getPrioridad());
            map.put("estado", t.getEstado());
            map.put("agenteAsignado", t.getAgenteAsignado());
            map.put("ultimoMensaje", t.getUltimoMensaje());
            map.put("fechaCreacion", t.getFechaCreacion().toString());
            map.put("fechaActualizacion", t.getFechaActualizacion().toString());
            long noLeidos = mensajeRepository.countByTicketIdAndEmisorTipoAndLeidoPorDestinatarioFalse(t.getId(), "SUPERADMIN");
            map.put("mensajesNoLeidos", noLeidos);
            return map;
        }).collect(Collectors.toList());
    }

    @PostMapping("/api/tenant/soporte/tickets")
    public ResponseEntity<SaasSoporteTicket> crearTicketTenant(
        @RequestBody Map<String, Object> body
    ) {
        Long tid = TenantContext.getCurrentTenant();
        if (tid == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }

        String nombreEmpresa = (String) body.get("nombreEmpresa");
        if (nombreEmpresa == null || nombreEmpresa.trim().isEmpty()) {
            LicenciaTenant lic = licenciaRepository.findByTenantId(tid).orElse(null);
            nombreEmpresa = lic != null ? lic.getNombreEmpresa() : "Negocio #" + tid;
        }

        String titulo = (String) body.get("tituloAsunto");
        if (titulo == null || titulo.trim().isEmpty()) {
            throw new RuntimeException("El asunto del ticket es obligatorio");
        }

        String mensajeInicial = (String) body.get("mensajeInicial");
        if (mensajeInicial == null || mensajeInicial.trim().isEmpty()) {
            throw new RuntimeException("El mensaje inicial es obligatorio");
        }

        String usuario = (String) body.getOrDefault("usuarioCreador", "admin-tenant");
        String categoria = (String) body.getOrDefault("categoria", "SOPORTE_TECNICO");
        String prioridad = (String) body.getOrDefault("prioridad", "MEDIA");

        SaasSoporteTicket ticket = new SaasSoporteTicket();
        ticket.setTenantId(tid);
        ticket.setNombreEmpresa(nombreEmpresa);
        ticket.setUsuarioCreador(usuario);
        ticket.setTituloAsunto(titulo.trim());
        ticket.setCategoria(categoria);
        ticket.setPrioridad(prioridad);
        ticket.setEstado("ABIERTO");
        ticket.setUltimoMensaje(mensajeInicial.trim());
        ticket.setFechaCreacion(LocalDateTime.now());
        ticket.setFechaActualizacion(LocalDateTime.now());
        SaasSoporteTicket guardado = ticketRepository.save(ticket);

        // Guardar primer mensaje
        SaasSoporteMensaje msg = new SaasSoporteMensaje();
        msg.setTicketId(guardado.getId());
        msg.setEmisorTipo("TENANT");
        msg.setEmisorNombre(usuario);
        msg.setContenido(mensajeInicial.trim());
        msg.setImagen(validarImagen((String) body.get("imagen")));
        msg.setFechaEnvio(LocalDateTime.now());
        msg.setLeidoPorDestinatario(false);
        mensajeRepository.save(msg);

        return ResponseEntity.ok(guardado);
    }

    @GetMapping("/api/tenant/soporte/tickets/{id:[0-9]+}/mensajes")
    public List<SaasSoporteMensaje> listarMensajesTenant(@PathVariable Long id) {
        ticketDelTenant(id);
        List<SaasSoporteMensaje> msgs = mensajeRepository.findByTicketIdOrderByFechaEnvioAsc(id);
        // Marcar como leidos los mensajes que envió el superadmin
        for (SaasSoporteMensaje m : msgs) {
            if ("SUPERADMIN".equalsIgnoreCase(m.getEmisorTipo()) && !m.isLeidoPorDestinatario()) {
                m.setLeidoPorDestinatario(true);
                mensajeRepository.save(m);
            }
        }
        return msgs;
    }

    @PostMapping("/api/tenant/soporte/tickets/{id:[0-9]+}/mensajes")
    public ResponseEntity<SaasSoporteMensaje> enviarMensajeTenant(
        @PathVariable Long id,
        @RequestBody Map<String, String> body
    ) {
        SaasSoporteTicket ticket = ticketDelTenant(id);

        String imagen = validarImagen(body.get("imagen"));
        String contenido = body.get("contenido");
        if ((contenido == null || contenido.trim().isEmpty()) && imagen == null) {
            throw new RuntimeException("El mensaje no puede estar vacio");
        }
        if (contenido == null || contenido.trim().isEmpty()) contenido = "(Captura de pantalla adjunta)";

        // Quién escribe sale de la sesión, no del body (antes se podía firmar con cualquier nombre).
        String usuarioSesion = com.auroraplus.core.auth.AuthContext.getUsername();
        String emisor = usuarioSesion != null ? usuarioSesion : ticket.getUsuarioCreador();

        SaasSoporteMensaje msg = new SaasSoporteMensaje();
        msg.setTicketId(id);
        msg.setEmisorTipo("TENANT");
        msg.setEmisorNombre(emisor);
        msg.setContenido(contenido.trim());
        msg.setImagen(imagen);
        msg.setFechaEnvio(LocalDateTime.now());
        msg.setLeidoPorDestinatario(false);
        SaasSoporteMensaje guardado = mensajeRepository.save(msg);

        // Actualizar ticket
        ticket.setUltimoMensaje(contenido.trim());
        ticket.setFechaActualizacion(LocalDateTime.now());
        if ("RESUELTO".equalsIgnoreCase(ticket.getEstado())) {
            // Si el cliente vuelve a escribir en un ticket resuelto, se reabre
            ticket.setEstado("ABIERTO");
        }
        ticketRepository.save(ticket);

        return ResponseEntity.ok(guardado);
    }

    private static final int MAX_LARGO_IMAGEN = 4_000_000; // ~3 MB de imagen en base64

    /** Solo imágenes en data URL y de tamaño razonable (el navegador ya las comprime). */
    private static String validarImagen(String imagen) {
        if (imagen == null || imagen.isBlank()) return null;
        if (!imagen.startsWith("data:image/")) throw new RuntimeException("Solo se pueden adjuntar imágenes");
        if (imagen.length() > MAX_LARGO_IMAGEN) throw new RuntimeException("La imagen es demasiado pesada. Toma la captura de nuevo o recórtala.");
        return imagen;
    }

    /** Un negocio solo ve y escribe en sus propios tickets (el id de la URL no basta). */
    private SaasSoporteTicket ticketDelTenant(Long id) {
        Long tenant = com.auroraplus.core.config.TenantContext.getCurrentTenant();
        return ticketRepository.findById(id)
            .filter(t -> tenant != null && String.valueOf(tenant).equals(String.valueOf(t.getTenantId())))
            .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
    }
}
