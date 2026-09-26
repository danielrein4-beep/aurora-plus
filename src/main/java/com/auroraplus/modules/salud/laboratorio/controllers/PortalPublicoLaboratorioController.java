package com.auroraplus.modules.salud.laboratorio.controllers;

import com.auroraplus.modules.salud.laboratorio.entities.OrdenLaboratorio;
import com.auroraplus.modules.salud.laboratorio.services.SaludLaboratorioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/laboratorio")
public class PortalPublicoLaboratorioController {

    @Autowired
    private SaludLaboratorioService laboratorioService;

    private static final int DIAS_VIGENCIA_ENLACE = 90;

    static String enmascararCedula(String cedula) {
        if (cedula == null || cedula.isBlank()) return cedula;
        String limpia = cedula.trim();
        int visibles = Math.min(4, limpia.length());
        String prefijo = limpia.matches("^[A-Za-z]-.*") ? limpia.substring(0, 2) : "";
        return prefijo + "****" + limpia.substring(limpia.length() - visibles);
    }

    @GetMapping("/{token}")
    public ResponseEntity<?> consultarOrden(@PathVariable String token) {
        var ordenOpt = laboratorioService.buscarPorToken(token);
        if (ordenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Orden no encontrada",
                "mensaje", "El código o enlace de orden no existe en el sistema."
            ));
        }

        OrdenLaboratorio orden = ordenOpt.get();

        // 🛡️ PROTOCOLO DE SEGURIDAD CONTRA QR ABANDONADO:
        // Si la orden ya fue sellada, NO revelamos el expediente clínico ni permitimos edición.
        if ("SELLADA".equalsIgnoreCase(orden.getEstado())) {
            Map<String, Object> respSellada = new HashMap<>();
            respSellada.put("estado", "SELLADA");
            respSellada.put("codigoOrden", orden.getCodigoOrden());
            respSellada.put("mensaje", "Esta orden médica ya fue procesada y archivada de forma segura en el expediente clínico privado del paciente. El enlace público ha expirado.");
            if (orden.getResultado() != null) {
                respSellada.put("laboratorioEmisor", orden.getResultado().getNombreLaboratorio());
                respSellada.put("fechaProcesamiento", orden.getResultado().getFechaCarga());
            }
            return ResponseEntity.ok(respSellada);
        }

        // Un enlace abierto no puede servir para siempre: si la orden no se procesó en 90 días,
        // el enlace deja de mostrar datos del paciente (el médico puede emitir una nueva).
        if (orden.getFechaEmision() != null && orden.getFechaEmision().isBefore(java.time.LocalDateTime.now().minusDays(DIAS_VIGENCIA_ENLACE))) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "error", "Enlace vencido",
                "mensaje", "Esta orden tiene más de " + DIAS_VIGENCIA_ENLACE + " días sin procesarse. Pide al médico una orden nueva."
            ));
        }

        // Orden ABIERTA lista para que el bioanalista procese:
        Map<String, Object> respAbierta = new HashMap<>();
        respAbierta.put("estado", orden.getEstado());
        respAbierta.put("codigoOrden", orden.getCodigoOrden());
        respAbierta.put("pacienteNombre", orden.getPacienteNombre());
        // Solo los últimos dígitos: basta para cotejar con la cédula física del paciente, sin
        // exponerla completa a quien tenga el enlace.
        respAbierta.put("pacienteCedula", enmascararCedula(orden.getPacienteCedula()));
        respAbierta.put("medicoNombre", orden.getMedicoNombre());
        respAbierta.put("fechaEmision", orden.getFechaEmision());
        respAbierta.put("examenesSolicitados", orden.getExamenesSolicitados());
        respAbierta.put("indicacionesClinicas", orden.getIndicacionesClinicas());
        respAbierta.put("diagnosticoPresuntivo", orden.getDiagnosticoPresuntivo());
        respAbierta.put("laboratorioSugerido", orden.getLaboratorioSugerido());

        return ResponseEntity.ok(respAbierta);
    }

    @PostMapping("/{token}/subir")
    public ResponseEntity<?> subirResultado(
            @PathVariable String token,
            @RequestBody SubirResultadoDTO dto,
            HttpServletRequest request
    ) {
        try {
            if (dto.nombreLaboratorio == null || dto.nombreLaboratorio.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El nombre del laboratorio es obligatorio"));
            }
            if (dto.bioanalistaResponsable == null || dto.bioanalistaResponsable.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El nombre del bioanalista o responsable es obligatorio"));
            }

            String ip = request.getRemoteAddr();

            OrdenLaboratorio sellada = laboratorioService.cargarResultadoYSealar(
                    token,
                    dto.nombreLaboratorio.trim(),
                    dto.bioanalistaResponsable.trim(),
                    dto.colegiaturaBioanalista,
                    dto.informeDetallado,
                    dto.conclusionDiagnostica,
                    dto.observacionesMuestra,
                    dto.valoresCriticos,
                    dto.detalleValoresCriticos,
                    dto.adjuntos,
                    ip
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "mensaje", "Resultados y reporte clínico sellados con éxito. Se ha depositado la información en el expediente del paciente.",
                "codigoOrden", sellada.getCodigoOrden(),
                "estado", sellada.getEstado()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", "Acceso denegado",
                "mensaje", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Error interno",
                "mensaje", "No se pudo procesar el resultado: " + e.getMessage()
            ));
        }
    }

    public static class SubirResultadoDTO {
        public String nombreLaboratorio;
        public String bioanalistaResponsable;
        public String colegiaturaBioanalista;
        public String informeDetallado;
        public String conclusionDiagnostica;
        public String observacionesMuestra;
        public boolean valoresCriticos;
        public String detalleValoresCriticos;
        public List<SaludLaboratorioService.AdjuntoPayload> adjuntos;
    }
}
