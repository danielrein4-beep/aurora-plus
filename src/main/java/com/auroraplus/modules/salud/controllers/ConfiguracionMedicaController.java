package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.ConfiguracionMedica;
import com.auroraplus.modules.salud.repositories.ConfiguracionMedicaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Verificación REAL (server-side) del PIN del Médico Titular que abre el Panel
 * Médico de Mediclinic. Antes de esto, ModalClaveDoctor comparaba el PIN tecleado
 * contra un valor guardado en localStorage del navegador, en texto plano, con
 * "1234" como default — cualquiera con las herramientas de desarrollador podía
 * leerlo o saltarse la comparación por completo. Ahora el PIN nunca sale del
 * servidor: se guarda hasheado y esta es la única forma de validarlo o cambiarlo.
 */
@RestController
@RequestMapping("/api/salud/config/pin")
public class ConfiguracionMedicaController {

    private static final String PIN_DE_FABRICA = "1234";

    @Autowired
    private ConfiguracionMedicaRepository configuracionMedicaRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @GetMapping("/estado")
    public ResponseEntity<?> estado() {
        Long tenantId = TenantContext.getCurrentTenant();
        boolean personalizada = configuracionMedicaRepository.findByTenantId(tenantId)
            .map(c -> Boolean.TRUE.equals(c.getClaveDoctorPersonalizada()))
            .orElse(false);
        return ResponseEntity.ok(Map.of("personalizada", personalizada));
    }

    @PostMapping("/verificar")
    public ResponseEntity<?> verificar(@RequestBody Map<String, String> body) {
        Long tenantId = TenantContext.getCurrentTenant();
        String pin = body.get("pin") != null ? body.get("pin").trim() : "";

        ConfiguracionMedica config = configuracionMedicaRepository.findByTenantId(tenantId).orElse(null);
        boolean valido = (config == null)
            ? PIN_DE_FABRICA.equals(pin)
            : passwordEncoder.matches(pin, config.getClaveDoctorHash());

        return ResponseEntity.ok(Map.of("valido", valido));
    }

    /** Configura o cambia el PIN — solo el Dueño/Administrador o el Médico pueden hacerlo. */
    @PostMapping("/configurar")
    public ResponseEntity<?> configurar(@RequestBody Map<String, String> body) {
        AuthContext.exigirRol("DUENO_ADMIN", "MEDICO");
        Long tenantId = TenantContext.getCurrentTenant();
        String pinNuevo = body.get("pinNuevo") != null ? body.get("pinNuevo").trim() : "";
        if (pinNuevo.length() != 4 || !pinNuevo.chars().allMatch(Character::isDigit)) {
            throw new RuntimeException("El PIN debe tener exactamente 4 dígitos numéricos");
        }

        ConfiguracionMedica config = configuracionMedicaRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                ConfiguracionMedica nueva = new ConfiguracionMedica();
                nueva.setTenantId(tenantId);
                return nueva;
            });

        // Si ya había un PIN personalizado, exigir el actual antes de cambiarlo — igual
        // que cualquier cambio de contraseña real, para que quien encuentre una sesión
        // abierta del Médico no pueda arrebatarle el acceso cambiándole el PIN sin más.
        if (Boolean.TRUE.equals(config.getClaveDoctorPersonalizada())) {
            String pinActual = body.get("pinActual") != null ? body.get("pinActual").trim() : "";
            if (!passwordEncoder.matches(pinActual, config.getClaveDoctorHash())) {
                throw new RuntimeException("El PIN actual no es correcto");
            }
        }

        config.setClaveDoctorHash(passwordEncoder.encode(pinNuevo));
        config.setClaveDoctorPersonalizada(true);
        configuracionMedicaRepository.save(config);

        auditoriaService.registrar(tenantId, "SALUD", "EDITAR", "ConfiguracionMedica", tenantId, "Cambió el PIN del Médico Titular");

        return ResponseEntity.ok(Map.of("mensaje", "PIN actualizado correctamente"));
    }
}
