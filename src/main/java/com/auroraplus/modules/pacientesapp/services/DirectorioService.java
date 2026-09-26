package com.auroraplus.modules.pacientesapp.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.pacientesapp.entities.PerfilConsultorio;
import com.auroraplus.modules.pacientesapp.entities.SolicitudCitaApp;
import com.auroraplus.modules.pacientesapp.repositories.PerfilConsultorioRepository;
import com.auroraplus.modules.pacientesapp.repositories.SolicitudCitaAppRepository;
import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.repositories.BloqueoAgendaRepository;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import com.auroraplus.modules.salud.repositories.ConfiguracionMedicaRepository;
import com.auroraplus.modules.salud.services.MedicoTenantResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Directorio público de la app: los consultorios de Salud que decidieron publicarse,
 * y sus horas libres calculadas contra la agenda real de Mediclinic.
 */
@Service
public class DirectorioService {

    /** Especialidades que la app sabe mostrar (id -> nombre formal para la cita). */
    public static final Map<String, String> ESPECIALIDADES = Map.of(
        "general", "Medicina general",
        "cardiologia", "Cardiología",
        "neurologia", "Neurología",
        "pediatria", "Pediatría",
        "odontologia", "Odontología",
        "oftalmologia", "Oftalmología",
        "dermatologia", "Dermatología",
        "traumatologia", "Traumatología"
    );

    public static final int DIAS_MAXIMOS_ADELANTE = 60;
    private static final Set<CitaMedica.EstadoCita> ESTADOS_QUE_NO_OCUPAN =
        EnumSet.of(CitaMedica.EstadoCita.CANCELADA, CitaMedica.EstadoCita.NO_ASISTIO);

    @Autowired private PerfilConsultorioRepository perfiles;
    @Autowired private LicenciaTenantRepository licencias;
    @Autowired private ConfiguracionMedicaRepository configuraciones;
    @Autowired private MedicoTenantResolver medicoResolver;
    @Autowired private CitaMedicaRepository citas;
    @Autowired private BloqueoAgendaRepository bloqueos;
    @Autowired private SolicitudCitaAppRepository solicitudes;

    public record ClinicaDto(Long id, String nombre, String ciudad, String horario) {}
    public record MedicoDto(Long id, String nombre, String titulo, String especialidad, ClinicaDto clinica,
                            Double calificacion, int resenas, Integer anios, BigDecimal precio, String moneda,
                            boolean disponibleHoy, boolean aceptaMensajes, String bio) {}
    public record HoraDto(String hora, boolean libre) {}

    public List<MedicoDto> listar() {
        List<MedicoDto> r = new ArrayList<>();
        for (PerfilConsultorio p : perfiles.findByPublicadoTrue()) {
            aDto(p).ifPresent(r::add);
        }
        r.sort(Comparator.comparing(MedicoDto::nombre, String.CASE_INSENSITIVE_ORDER));
        return r;
    }

    public MedicoDto medico(Long tenantId) {
        return perfiles.findById(tenantId).filter(PerfilConsultorio::isPublicado).flatMap(this::aDto)
            .orElseThrow(() -> new RuntimeException("Este médico ya no está en el directorio"));
    }

    /** Perfil publicado de un consultorio con licencia activa, o error. */
    public PerfilConsultorio perfilPublicado(Long tenantId) {
        PerfilConsultorio p = perfiles.findById(tenantId).filter(PerfilConsultorio::isPublicado)
            .orElseThrow(() -> new RuntimeException("Este médico ya no está en el directorio"));
        if (licenciaActiva(tenantId).isEmpty()) throw new RuntimeException("Este consultorio no está recibiendo citas por ahora");
        return p;
    }

    public List<HoraDto> horarios(Long tenantId, LocalDate fecha) {
        return horariosDe(perfilPublicado(tenantId), fecha);
    }

    List<HoraDto> horariosDe(PerfilConsultorio p, LocalDate fecha) {
        LocalDate hoy = LocalDate.now();
        if (fecha.isBefore(hoy) || fecha.isAfter(hoy.plusDays(DIAS_MAXIMOS_ADELANTE))) return List.of();
        if (!diasAtencion(p).contains(fecha.getDayOfWeek())) return List.of();

        Long tenantId = p.getTenantId();
        List<CitaMedica> ocupadas = citas.findByTenantIdAndFecha(tenantId, fecha).stream()
            .filter(c -> !ESTADOS_QUE_NO_OCUPAN.contains(c.getEstado())).toList();
        List<SolicitudCitaApp> pendientes = solicitudes.findByTenantIdAndFechaAndEstado(tenantId, fecha, SolicitudCitaApp.Estado.SOLICITADA);
        List<BloqueoAgenda> bloqueosDelDia = medicoResolver.resolverMedicoDelTenant(tenantId)
            .map(m -> bloqueos.buscarBloqueosEnFecha(tenantId, m.id, fecha)).orElse(List.of());
        LocalDateTime minimo = LocalDateTime.now().plusMinutes(30);

        List<HoraDto> r = new ArrayList<>();
        int paso = Math.max(10, p.getDuracionMinutos());
        for (LocalTime t = p.getHoraInicio(); !t.plusMinutes(paso).isAfter(p.getHoraFin()); t = t.plusMinutes(paso)) {
            LocalTime ini = t, fin = t.plusMinutes(paso);
            boolean libre = fecha.atTime(ini).isAfter(minimo)
                && ocupadas.stream().noneMatch(c -> ini.isBefore(c.getHoraFin()) && fin.isAfter(c.getHoraInicio()))
                && pendientes.stream().noneMatch(s -> ini.isBefore(s.getHoraFin()) && fin.isAfter(s.getHoraInicio()))
                && bloqueosDelDia.stream().noneMatch(b -> b.getHoraInicio() == null || b.getHoraFin() == null
                    || (ini.isBefore(b.getHoraFin()) && fin.isAfter(b.getHoraInicio())));
            r.add(new HoraDto(String.format("%02d:%02d", ini.getHour(), ini.getMinute()), libre));
            if (fin.isBefore(ini)) break; // pasó de medianoche
        }
        return r;
    }

    public String nombreMedico(Long tenantId) {
        String nombre = configuraciones.findByTenantId(tenantId).map(c -> c.getDoctorNombre()).filter(n -> n != null && !n.isBlank())
            .orElseGet(() -> medicoResolver.resolverMedicoDelTenant(tenantId).map(m -> m.nombre).orElse("Médico"));
        return nombre.replaceFirst("(?i)^\\s*dra?\\.?\\s+", "").trim();
    }

    public String nombreConsultorio(Long tenantId) {
        return licencias.findByTenantId(tenantId).map(LicenciaTenant::getNombreEmpresa).orElse("Consultorio");
    }

    private Optional<MedicoDto> aDto(PerfilConsultorio p) {
        Optional<LicenciaTenant> lic = licenciaActiva(p.getTenantId());
        if (lic.isEmpty()) return Optional.empty();
        ClinicaDto clinica = new ClinicaDto(p.getTenantId(), lic.get().getNombreEmpresa(), p.getCiudad(), textoHorario(p));
        boolean hoy = horariosDe(p, LocalDate.now()).stream().anyMatch(HoraDto::libre);
        return Optional.of(new MedicoDto(p.getTenantId(), nombreMedico(p.getTenantId()), p.getTrato(),
            ESPECIALIDADES.containsKey(p.getEspecialidad()) ? p.getEspecialidad() : "general", clinica,
            null, 0, p.getAniosExperiencia(), p.getPrecioConsulta(), p.getMoneda(), hoy, p.isAceptaMensajes(), p.getBio()));
    }

    private Optional<LicenciaTenant> licenciaActiva(Long tenantId) {
        return licencias.findByTenantId(tenantId)
            .filter(LicenciaTenant::isActiva)
            .filter(l -> l.getModuloPrincipal() == null || l.getModuloPrincipal().toLowerCase().startsWith("salud"));
    }

    static Set<DayOfWeek> diasAtencion(PerfilConsultorio p) {
        Set<DayOfWeek> dias = EnumSet.noneOf(DayOfWeek.class);
        for (String d : p.getDiasAtencion().split(",")) {
            try { dias.add(DayOfWeek.of(Integer.parseInt(d.trim()))); } catch (RuntimeException ignorado) { /* valor raro: se salta */ }
        }
        return dias;
    }

    private static final String[] DIAS_CORTOS = {"lun", "mar", "mié", "jue", "vie", "sáb", "dom"};

    static String textoHorario(PerfilConsultorio p) {
        List<Integer> dias = diasAtencion(p).stream().map(DayOfWeek::getValue).sorted().toList();
        String textoDias;
        if (dias.isEmpty()) textoDias = "Sin días";
        else if (dias.get(dias.size() - 1) - dias.get(0) == dias.size() - 1 && dias.size() > 1)
            textoDias = cap(DIAS_CORTOS[dias.get(0) - 1]) + " a " + DIAS_CORTOS[dias.get(dias.size() - 1) - 1];
        else textoDias = cap(String.join(", ", dias.stream().map(d -> DIAS_CORTOS[d - 1]).toList()));
        return textoDias + ", " + hora(p.getHoraInicio()) + " a " + hora(p.getHoraFin());
    }

    private static String cap(String s) { return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1); }
    private static String hora(LocalTime t) { return t.getHour() + ":" + String.format("%02d", t.getMinute()); }
}
