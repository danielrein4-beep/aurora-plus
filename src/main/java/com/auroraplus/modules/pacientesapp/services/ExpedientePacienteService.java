package com.auroraplus.modules.pacientesapp.services;

import com.auroraplus.modules.pacientesapp.entities.PacienteApp;
import com.auroraplus.modules.pacientesapp.entities.PlanCompartido;
import com.auroraplus.modules.pacientesapp.entities.VinculoPacienteApp;
import com.auroraplus.modules.pacientesapp.repositories.PacienteAppRepository;
import com.auroraplus.modules.pacientesapp.repositories.PlanCompartidoRepository;
import com.auroraplus.modules.pacientesapp.repositories.VinculoPacienteAppRepository;
import com.auroraplus.modules.salud.entities.ConsultaMedica;
import com.auroraplus.modules.salud.laboratorio.entities.ArchivoExamenRecibido;
import com.auroraplus.modules.salud.laboratorio.entities.ExamenRecibidoPaciente;
import com.auroraplus.modules.salud.laboratorio.repositories.ExamenRecibidoPacienteRepository;
import com.auroraplus.modules.salud.repositories.ConsultaMedicaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Lo que el paciente ve y aporta de su propia historia, sin tocar la historia clínica:
 * - Exámenes: la foto o PDF que sube el paciente cae en la bandeja de exámenes recibidos
 *   que Mediclinic ya tiene (la misma del portal de laboratorio), ligada a su ficha.
 *   "Revisado" es cuando alguien del consultorio lo marcó como leído.
 * - Planes: solo lo que el médico compartió explícitamente (copia, ver PlanCompartido).
 * Todo exige un vínculo con el consultorio (nace cuando la clínica acepta una cita).
 */
@Service
public class ExpedientePacienteService {

    private static final int MAX_ARCHIVOS = 4;
    private static final int MAX_BYTES_ARCHIVO = 6 * 1024 * 1024;
    private static final Map<String, String> TIPOS_PERMITIDOS = Map.of(
        "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp", "application/pdf", "pdf");

    @Autowired private VinculoPacienteAppRepository vinculos;
    @Autowired private PacienteAppRepository pacientesApp;
    @Autowired private ExamenRecibidoPacienteRepository examenes;
    @Autowired private PlanCompartidoRepository planes;
    @Autowired private ConsultaMedicaRepository consultas;

    public record ArchivoSubido(String nombre, String tipo, String datosBase64) {}
    public record ExamenDto(Long id, Long medicoId, String fecha, int archivos, boolean revisado, String revisadoEn) {}
    public record PlanDto(Long id, Long medicoId, String fechaConsulta, String compartidoEn, String diagnostico,
                          String planTratamiento, String indicaciones, String recipe, String examenesIndicados) {}
    public record EstadoCompartido(boolean pacienteUsaLaApp, boolean compartido, String compartidoEn) {}

    // ---------- Lado del paciente ----------

    @Transactional
    public ExamenDto subirExamen(Long pacienteAppId, Long tenantId, String nota, List<ArchivoSubido> archivos) {
        VinculoPacienteApp v = vinculos.findByPacienteAppIdAndTenantId(pacienteAppId, tenantId)
            .orElseThrow(() -> new RuntimeException("Puedes enviar exámenes a un consultorio después de tu primera cita confirmada con él"));
        if (archivos == null || archivos.isEmpty()) throw new RuntimeException("Agrega al menos una foto o PDF");
        if (archivos.size() > MAX_ARCHIVOS) throw new RuntimeException("Puedes enviar hasta " + MAX_ARCHIVOS + " archivos a la vez");
        PacienteApp p = pacientesApp.findById(pacienteAppId).orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));

        ExamenRecibidoPaciente examen = new ExamenRecibidoPaciente();
        examen.setTenantId(tenantId);
        examen.setPacienteId(v.getPacienteId());
        examen.setCedulaIngresada(Cedula.conGuion(p.getCedula()));
        String nombre = p.getNombre() + " (desde la app)";
        if (nota != null && !nota.isBlank()) nombre += ": " + nota.trim();
        examen.setNombreIngresado(nombre.substring(0, Math.min(150, nombre.length())));
        examen.setTelefonoIngresado(p.getTelefono());

        int orden = 0;
        for (ArchivoSubido a : archivos) {
            // Base64 ocupa ~4/3 del archivo: se corta antes de decodificar algo enorme.
            if (a.datosBase64() != null && a.datosBase64().length() > MAX_BYTES_ARCHIVO / 3 * 4 + 200) {
                throw new RuntimeException("Cada archivo puede pesar hasta 6 MB");
            }
            byte[] bytes = decodificar(a.datosBase64());
            String tipo = tipoReal(bytes);
            if (tipo == null) throw new RuntimeException("Solo se aceptan fotos (JPG, PNG, WEBP) o PDF");
            if (bytes.length > MAX_BYTES_ARCHIVO) throw new RuntimeException("Cada archivo puede pesar hasta 6 MB");
            ArchivoExamenRecibido archivo = new ArchivoExamenRecibido();
            String nombreArchivo = a.nombre() == null || a.nombre().isBlank() ? "examen-" + (orden + 1) + "." + TIPOS_PERMITIDOS.get(tipo) : a.nombre().trim();
            archivo.setNombreArchivo(nombreArchivo.substring(0, Math.min(200, nombreArchivo.length())));
            archivo.setTipoMime(tipo);
            archivo.setContenidoBase64("data:" + tipo + ";base64," + Base64.getEncoder().encodeToString(bytes));
            archivo.setOrden(orden++);
            examen.agregarArchivo(archivo);
        }
        return aDto(examenes.save(examen));
    }

    public List<ExamenDto> misExamenes(Long pacienteAppId) {
        List<ExamenDto> r = new ArrayList<>();
        for (VinculoPacienteApp v : vinculos.findByPacienteAppId(pacienteAppId)) {
            examenes.findByTenantIdAndPacienteIdOrderByFechaHoraRecepcionDesc(v.getTenantId(), v.getPacienteId()).forEach(e -> r.add(aDto(e)));
        }
        r.sort(Comparator.comparing(ExamenDto::fecha).reversed());
        return r;
    }

    public List<PlanDto> misPlanes(Long pacienteAppId) {
        List<PlanDto> r = new ArrayList<>();
        for (VinculoPacienteApp v : vinculos.findByPacienteAppId(pacienteAppId)) {
            planes.findByTenantIdAndPacienteIdOrderByFechaConsultaDesc(v.getTenantId(), v.getPacienteId()).forEach(p -> r.add(aDto(p)));
        }
        r.sort(Comparator.comparing(PlanDto::fechaConsulta).reversed());
        return r;
    }

    // ---------- Lado del médico (Mediclinic) ----------

    public EstadoCompartido estadoConsulta(Long tenantId, Long consultaId) {
        ConsultaMedica c = consultaPropia(tenantId, consultaId);
        boolean usaApp = vinculoDe(tenantId, c.getPaciente().getId());
        PlanCompartido p = planes.findByTenantIdAndConsultaId(tenantId, consultaId).orElse(null);
        return new EstadoCompartido(usaApp, p != null, p == null ? null : p.getCompartidoEn().toString());
    }

    @Transactional
    public EstadoCompartido compartir(Long tenantId, Long consultaId, boolean incluirDiagnostico, String usuario) {
        ConsultaMedica c = consultaPropia(tenantId, consultaId);
        Long pacienteId = c.getPaciente().getId();
        if (!vinculoDe(tenantId, pacienteId)) throw new RuntimeException("Este paciente todavía no usa Mediclinic Pacientes");
        if (vacio(c.getPlanTratamiento()) && vacio(c.getIndicacionesGenerales()) && vacio(c.getRecipeMedicamentos()) && vacio(c.getOrdenExamenes())) {
            throw new RuntimeException("La consulta no tiene plan, indicaciones, récipe ni exámenes para compartir");
        }
        PlanCompartido p = planes.findByTenantIdAndConsultaId(tenantId, consultaId).orElseGet(PlanCompartido::new);
        p.setTenantId(tenantId);
        p.setConsultaId(consultaId);
        p.setPacienteId(pacienteId);
        p.setFechaConsulta(c.getFechaHora());
        p.setDiagnostico(incluirDiagnostico ? c.getDescripcionDiagnostico() : null);
        p.setPlanTratamiento(c.getPlanTratamiento());
        p.setIndicaciones(c.getIndicacionesGenerales());
        p.setRecipe(c.getRecipeMedicamentos());
        p.setExamenesIndicados(c.getOrdenExamenes());
        p.setCompartidoPor(usuario);
        p.setCompartidoEn(LocalDateTime.now());
        planes.save(p);
        return new EstadoCompartido(true, true, p.getCompartidoEn().toString());
    }

    @Transactional
    public EstadoCompartido dejarDeCompartir(Long tenantId, Long consultaId) {
        ConsultaMedica c = consultaPropia(tenantId, consultaId);
        planes.findByTenantIdAndConsultaId(tenantId, consultaId).ifPresent(planes::delete);
        return new EstadoCompartido(vinculoDe(tenantId, c.getPaciente().getId()), false, null);
    }

    /** findById no respeta el filtro de tenant: se verifica a mano (mismo cuidado que ConsultaMedicaService). */
    private ConsultaMedica consultaPropia(Long tenantId, Long consultaId) {
        ConsultaMedica c = consultas.findById(consultaId).orElseThrow(() -> new RuntimeException("Consulta no encontrada"));
        if (!tenantId.equals(c.getTenantId())) throw new RuntimeException("Consulta no encontrada");
        return c;
    }

    private boolean vinculoDe(Long tenantId, Long pacienteId) {
        return vinculos.existsByTenantIdAndPacienteId(tenantId, pacienteId);
    }

    private static boolean vacio(String s) { return s == null || s.isBlank(); }

    private static byte[] decodificar(String datos) {
        if (datos == null || datos.isBlank()) throw new RuntimeException("Un archivo llegó vacío");
        String puro = datos.contains(",") ? datos.substring(datos.indexOf(',') + 1) : datos;
        try {
            return Base64.getDecoder().decode(puro.replaceAll("\\s", ""));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Un archivo llegó dañado. Intenta de nuevo");
        }
    }

    /** Tipo según los primeros bytes, no según lo que diga el teléfono. */
    private static String tipoReal(byte[] b) {
        if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
        if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        if (b.length > 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return "application/pdf";
        return null;
    }

    private ExamenDto aDto(ExamenRecibidoPaciente e) {
        return new ExamenDto(e.getId(), e.getTenantId(), e.getFechaHoraRecepcion().toString(), e.getArchivos().size(),
            e.isLeido(), e.getFechaHoraLeido() == null ? null : e.getFechaHoraLeido().toString());
    }

    private PlanDto aDto(PlanCompartido p) {
        return new PlanDto(p.getId(), p.getTenantId(), p.getFechaConsulta().toString(), p.getCompartidoEn().toString(),
            p.getDiagnostico(), p.getPlanTratamiento(), p.getIndicaciones(), p.getRecipe(), p.getExamenesIndicados());
    }
}
