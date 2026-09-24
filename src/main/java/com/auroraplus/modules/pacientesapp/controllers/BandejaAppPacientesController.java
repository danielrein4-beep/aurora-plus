package com.auroraplus.modules.pacientesapp.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.pacientesapp.entities.PerfilConsultorio;
import com.auroraplus.modules.pacientesapp.repositories.PerfilConsultorioRepository;
import com.auroraplus.modules.pacientesapp.services.DirectorioService;
import com.auroraplus.modules.pacientesapp.services.PacientesAppConfig;
import com.auroraplus.modules.pacientesapp.services.SolicitudesCitaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Lado de Mediclinic: el consultorio decide si aparece en la app de pacientes y
 * responde las solicitudes de cita. Usa la sesión normal del negocio (TenantInterceptor).
 */
@RestController
@RequestMapping("/api/salud/app-pacientes")
public class BandejaAppPacientesController {

    private static final String[] ROLES_BANDEJA = {"DUENO_ADMIN", "MEDICO", "RECEPCIONISTA"};

    @Autowired private PacientesAppConfig config;
    @Autowired private PerfilConsultorioRepository perfiles;
    @Autowired private SolicitudesCitaService solicitudes;

    public record PerfilDto(boolean publicado, String trato, String especialidad, String ciudad, BigDecimal precioConsulta,
                            String moneda, Integer aniosExperiencia, String bio, boolean aceptaMensajes,
                            boolean confirmacionAutomatica, String horaInicio, String horaFin, int duracionMinutos, String diasAtencion) {
        static PerfilDto de(PerfilConsultorio p) {
            return new PerfilDto(p.isPublicado(), p.getTrato(), p.getEspecialidad(), p.getCiudad(), p.getPrecioConsulta(), p.getMoneda(),
                p.getAniosExperiencia(), p.getBio(), p.isAceptaMensajes(), p.isConfirmacionAutomatica(),
                p.getHoraInicio().toString(), p.getHoraFin().toString(), p.getDuracionMinutos(), p.getDiasAtencion());
        }
    }
    public record Rechazo(String motivo) {}

    @GetMapping("/perfil")
    public PerfilDto perfil() {
        config.exigirHabilitada();
        Long tenantId = TenantContext.getCurrentTenant();
        return PerfilDto.de(perfiles.findById(tenantId).orElseGet(() -> nuevoPerfil(tenantId)));
    }

    @PutMapping("/perfil")
    public PerfilDto guardarPerfil(@RequestBody PerfilDto body) {
        config.exigirHabilitada();
        AuthContext.exigirRol("DUENO_ADMIN", "MEDICO");
        Long tenantId = TenantContext.getCurrentTenant();
        PerfilConsultorio p = perfiles.findById(tenantId).orElseGet(() -> nuevoPerfil(tenantId));

        LocalTime inicio = LocalTime.parse(body.horaInicio());
        LocalTime fin = LocalTime.parse(body.horaFin());
        if (!fin.isAfter(inicio)) throw new RuntimeException("La hora de cierre debe ser después de la de apertura");
        if (body.duracionMinutos() < 10 || body.duracionMinutos() > 240) throw new RuntimeException("La duración de la consulta debe estar entre 10 y 240 minutos");
        if (body.especialidad() == null || !DirectorioService.ESPECIALIDADES.containsKey(body.especialidad())) throw new RuntimeException("Elige una especialidad de la lista");
        if (body.diasAtencion() == null || !body.diasAtencion().matches("[1-7](,[1-7])*")) throw new RuntimeException("Elige al menos un día de atención");
        if (body.precioConsulta() != null && body.precioConsulta().signum() < 0) throw new RuntimeException("El precio no puede ser negativo");

        p.setPublicado(body.publicado());
        p.setTrato("Dra.".equals(body.trato()) ? "Dra." : "Dr.");
        p.setEspecialidad(body.especialidad());
        p.setCiudad(recortar(body.ciudad(), 80));
        p.setPrecioConsulta(body.precioConsulta());
        p.setMoneda(body.moneda() == null || body.moneda().isBlank() ? "USD" : recortar(body.moneda(), 10));
        p.setAniosExperiencia(body.aniosExperiencia());
        p.setBio(recortar(body.bio(), 600));
        p.setAceptaMensajes(body.aceptaMensajes());
        p.setConfirmacionAutomatica(body.confirmacionAutomatica());
        p.setHoraInicio(inicio);
        p.setHoraFin(fin);
        p.setDuracionMinutos(body.duracionMinutos());
        p.setDiasAtencion(body.diasAtencion());
        p.setActualizadoEn(LocalDateTime.now());
        return PerfilDto.de(perfiles.save(p));
    }

    @GetMapping("/solicitudes")
    public List<SolicitudesCitaService.SolicitudClinicaDto> bandeja() {
        config.exigirHabilitada();
        AuthContext.exigirRol(ROLES_BANDEJA);
        return solicitudes.bandeja(TenantContext.getCurrentTenant());
    }

    @PostMapping("/solicitudes/{id}/aceptar")
    public SolicitudesCitaService.SolicitudClinicaDto aceptar(@PathVariable Long id) {
        config.exigirHabilitada();
        AuthContext.exigirRol(ROLES_BANDEJA);
        return solicitudes.aceptar(TenantContext.getCurrentTenant(), id, AuthContext.getUsername());
    }

    @PostMapping("/solicitudes/{id}/rechazar")
    public SolicitudesCitaService.SolicitudClinicaDto rechazar(@PathVariable Long id, @RequestBody(required = false) Rechazo body) {
        config.exigirHabilitada();
        AuthContext.exigirRol(ROLES_BANDEJA);
        return solicitudes.rechazar(TenantContext.getCurrentTenant(), id, body == null ? null : body.motivo(), AuthContext.getUsername());
    }

    private static PerfilConsultorio nuevoPerfil(Long tenantId) {
        PerfilConsultorio p = new PerfilConsultorio();
        p.setTenantId(tenantId);
        return p;
    }

    private static String recortar(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t.substring(0, Math.min(max, t.length()));
    }
}
