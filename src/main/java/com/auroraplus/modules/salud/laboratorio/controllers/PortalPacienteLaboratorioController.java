package com.auroraplus.modules.salud.laboratorio.controllers;

import com.auroraplus.modules.salud.laboratorio.services.PortalLaboratorioPacienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Portal público (sin login) donde el paciente sube sus resultados de
 * laboratorio escaneando el QR fijo del consultorio — ver
 * PortalLaboratorioPacienteService para el porqué de este flujo.
 */
@RestController
@RequestMapping("/api/public/laboratorio/portal")
public class PortalPacienteLaboratorioController {

    @Autowired
    private PortalLaboratorioPacienteService portalService;

    @GetMapping("/{token}")
    public ResponseEntity<?> obtenerInfo(@PathVariable String token) {
        try {
            return ResponseEntity.ok(portalService.obtenerInfoPortalPorToken(token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{token}/subir")
    public ResponseEntity<?> subir(
            @PathVariable String token,
            @RequestParam String cedula,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String telefono,
            @RequestParam("archivos") List<MultipartFile> archivos
    ) {
        try {
            portalService.recibirCarga(token, cedula, nombre, telefono, archivos);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "mensaje", "Sus resultados fueron enviados correctamente. Su médico los revisará en breve."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "No se pudo procesar el archivo: " + e.getMessage()));
        }
    }
}
