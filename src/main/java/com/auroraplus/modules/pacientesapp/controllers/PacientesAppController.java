package com.auroraplus.modules.pacientesapp.controllers;

import com.auroraplus.modules.pacientesapp.services.AccesoPacienteService;
import com.auroraplus.modules.pacientesapp.services.DirectorioService;
import com.auroraplus.modules.pacientesapp.services.ExpedientePacienteService;
import com.auroraplus.modules.pacientesapp.services.PacienteAppInterceptor;
import com.auroraplus.modules.pacientesapp.services.SolicitudesCitaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * API de la app Mediclinic Pacientes (repo aurora-pacientes).
 * La puerta y la sesión las maneja PacienteAppInterceptor; aquí solo se lee el paciente ya verificado.
 */
@RestController
@RequestMapping("/api/pacientes/v1")
public class PacientesAppController {

    @Autowired private AccesoPacienteService acceso;
    @Autowired private DirectorioService directorio;
    @Autowired private SolicitudesCitaService solicitudes;
    @Autowired private ExpedientePacienteService expediente;

    public record PedirCodigo(String cedula, String telefono, String nombre, boolean crearCuenta) {}
    public record VerificarCodigo(String cedula, String codigo) {}
    public record SolicitarCita(Long medicoId, LocalDate fecha, String hora, String motivo) {}
    public record SubirExamen(Long medicoId, String nota, List<ExpedientePacienteService.ArchivoSubido> archivos) {}

    // --- Entrada (sin sesión) ---

    @PostMapping("/auth/codigo")
    public AccesoPacienteService.CodigoEnviado pedirCodigo(@RequestBody PedirCodigo body) {
        return acceso.solicitarCodigo(body.cedula(), body.telefono(), body.nombre(), body.crearCuenta());
    }

    @PostMapping("/auth/verificar")
    public AccesoPacienteService.Sesion verificar(@RequestBody VerificarCodigo body) {
        return acceso.verificar(body.cedula(), body.codigo());
    }

    // --- Directorio (sin sesión) ---

    @GetMapping("/directorio/medicos")
    public List<DirectorioService.MedicoDto> medicos() {
        return directorio.listar();
    }

    @GetMapping("/directorio/medicos/{id}")
    public DirectorioService.MedicoDto medico(@PathVariable Long id) {
        return directorio.medico(id);
    }

    @GetMapping("/directorio/medicos/{id}/horarios")
    public List<DirectorioService.HoraDto> horarios(@PathVariable Long id,
                                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return directorio.horarios(id, fecha);
    }

    // --- Con sesión de paciente ---

    @GetMapping("/yo")
    public AccesoPacienteService.PacienteDto yo(HttpServletRequest req) {
        return acceso.yo(paciente(req));
    }

    @PostMapping("/sesion/cerrar-todas")
    public Map<String, Boolean> cerrarTodas(HttpServletRequest req) {
        acceso.cerrarSesiones(paciente(req));
        return Map.of("ok", true);
    }

    @GetMapping("/citas")
    public List<SolicitudesCitaService.CitaPacienteDto> misCitas(HttpServletRequest req) {
        return solicitudes.misCitas(paciente(req));
    }

    @PostMapping("/citas/solicitar")
    public SolicitudesCitaService.CitaPacienteDto solicitar(HttpServletRequest req, @RequestBody SolicitarCita body) {
        if (body.medicoId() == null || body.fecha() == null || body.hora() == null) throw new RuntimeException("Elige médico, día y hora");
        return solicitudes.solicitar(paciente(req), body.medicoId(), body.fecha(), body.hora(), body.motivo());
    }

    @PostMapping("/citas/{id}/cancelar")
    public SolicitudesCitaService.CitaPacienteDto cancelar(HttpServletRequest req, @PathVariable Long id) {
        return solicitudes.cancelarPorPaciente(paciente(req), id);
    }

    // --- Mi salud: exámenes que sube el paciente y planes que comparte el médico ---

    @GetMapping("/examenes")
    public List<ExpedientePacienteService.ExamenDto> misExamenes(HttpServletRequest req) {
        return expediente.misExamenes(paciente(req));
    }

    @PostMapping("/examenes")
    public ExpedientePacienteService.ExamenDto subirExamen(HttpServletRequest req, @RequestBody SubirExamen body) {
        if (body.medicoId() == null) throw new RuntimeException("Elige a qué médico se lo envías");
        return expediente.subirExamen(paciente(req), body.medicoId(), body.nota(), body.archivos());
    }

    @GetMapping("/planes")
    public List<ExpedientePacienteService.PlanDto> misPlanes(HttpServletRequest req) {
        return expediente.misPlanes(paciente(req));
    }

    private static Long paciente(HttpServletRequest req) {
        Object id = req.getAttribute(PacienteAppInterceptor.ATRIBUTO_PACIENTE);
        if (!(id instanceof Long l)) throw new RuntimeException("Falta la sesión");
        return l;
    }
}
