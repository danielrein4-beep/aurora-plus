package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
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
 * Mismo arreglo que ya tiene Aurora Salud en la rama de Daniel — portado aquí.
 */
@RestController
@RequestMapping("/api/salud/config")
public class ConfiguracionMedicaController {

    private static final String PIN_DE_FABRICA = "1234";

    @Autowired
    private ConfiguracionMedicaRepository configuracionMedicaRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @GetMapping("/pin/estado")
    public ResponseEntity<?> estado() {
        Long tenantId = TenantContext.getCurrentTenant();
        boolean personalizada = configuracionMedicaRepository.findByTenantId(tenantId)
            .map(c -> Boolean.TRUE.equals(c.getClaveDoctorPersonalizada()))
            .orElse(false);
        return ResponseEntity.ok(Map.of("personalizada", personalizada));
    }

    @PostMapping("/pin/verificar")
    public ResponseEntity<?> verificar(@RequestBody Map<String, String> body) {
        Long tenantId = TenantContext.getCurrentTenant();
        String pin = body.get("pin") != null ? body.get("pin").trim() : "";

        ConfiguracionMedica config = configuracionMedicaRepository.findByTenantId(tenantId).orElse(null);
        boolean valido = (config == null || config.getClaveDoctorHash() == null)
            ? PIN_DE_FABRICA.equals(pin)
            : passwordEncoder.matches(pin, config.getClaveDoctorHash());

        return ResponseEntity.ok(Map.of("valido", valido));
    }

    /** Configura o cambia el PIN — solo el Dueño/Administrador o el Médico pueden hacerlo. */
    @PostMapping("/pin/configurar")
    public ResponseEntity<?> configurar(@RequestBody Map<String, String> body) {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol) && !"MEDICO".equals(rol)) {
            throw new RuntimeException("Solo el Dueño/Administrador o el Médico pueden cambiar este PIN");
        }
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

        return ResponseEntity.ok(Map.of("mensaje", "PIN actualizado correctamente"));
    }

    // ── PERFIL MÉDICO Y MEMBRETE DE DOCUMENTOS ──
    // Antes vivía en configPerfil, guardado solo en localStorage del navegador — cada doctor
    // que abría sesión en otro dispositivo veía el membrete por defecto, no el suyo. Ahora se
    // guarda por tenant en el servidor y el frontend lo inyecta en cada PDF (ver pdfReports.ts).

    public static class PerfilMedicoResponse {
        public String doctorNombre;
        public String especialidad;
        public String matriculaMpps;
        public String colegioMedicos;
        public String encabezadoTexto;
        public String firmaBase64;
        public String plantillaRecordatorioCita;
    }

    private PerfilMedicoResponse aRespuesta(ConfiguracionMedica config) {
        PerfilMedicoResponse r = new PerfilMedicoResponse();
        if (config != null) {
            r.doctorNombre = config.getDoctorNombre();
            r.especialidad = config.getEspecialidad();
            r.matriculaMpps = config.getMatriculaMpps();
            r.colegioMedicos = config.getColegioMedicos();
            r.encabezadoTexto = config.getEncabezadoTexto();
            r.firmaBase64 = config.getFirmaBase64();
            r.plantillaRecordatorioCita = config.getPlantillaRecordatorioCita();
        }
        return r;
    }

    private ConfiguracionMedica obtenerOCrear(Long tenantId) {
        return configuracionMedicaRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                ConfiguracionMedica nueva = new ConfiguracionMedica();
                nueva.setTenantId(tenantId);
                return nueva;
            });
    }

    @GetMapping("/perfil")
    public PerfilMedicoResponse obtenerPerfil() {
        Long tenantId = TenantContext.getCurrentTenant();
        return aRespuesta(configuracionMedicaRepository.findByTenantId(tenantId).orElse(null));
    }

    public static class PerfilMedicoRequest {
        public String doctorNombre;
        public String especialidad;
        public String matriculaMpps;
        public String colegioMedicos;
        public String encabezadoTexto;
        public String plantillaRecordatorioCita;
    }

    @PutMapping("/perfil")
    public PerfilMedicoResponse actualizarPerfil(@RequestBody PerfilMedicoRequest request) {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol) && !"MEDICO".equals(rol)) {
            throw new RuntimeException("Solo el Dueño/Administrador o el Médico pueden editar el perfil médico");
        }
        Long tenantId = TenantContext.getCurrentTenant();
        ConfiguracionMedica config = obtenerOCrear(tenantId);
        config.setDoctorNombre(request.doctorNombre);
        config.setEspecialidad(request.especialidad);
        config.setMatriculaMpps(request.matriculaMpps);
        config.setColegioMedicos(request.colegioMedicos);
        config.setEncabezadoTexto(request.encabezadoTexto);
        config.setPlantillaRecordatorioCita(request.plantillaRecordatorioCita);
        configuracionMedicaRepository.save(config);
        return aRespuesta(config);
    }

    public static class FirmaRequest {
        public String firmaBase64;
    }

    @PutMapping("/firma")
    public PerfilMedicoResponse actualizarFirma(@RequestBody FirmaRequest request) {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol) && !"MEDICO".equals(rol)) {
            throw new RuntimeException("Solo el Dueño/Administrador o el Médico pueden editar la firma electrónica");
        }
        Long tenantId = TenantContext.getCurrentTenant();
        ConfiguracionMedica config = obtenerOCrear(tenantId);
        config.setFirmaBase64(request.firmaBase64);
        configuracionMedicaRepository.save(config);
        return aRespuesta(config);
    }
}
