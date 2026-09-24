package com.auroraplus.core.config;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.services.VerificacionMercadoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Equipo verificador del Mercado Ganadero: revisa la cédula del titular, el registro de hierro
 * y (opcional) el documento de la tierra de cada finca. Solo PROPIETARIO y SOPORTE (ver
 * PermisosSuperAdmin): analistas y finanzas no ven documentos personales. Cada apertura,
 * aprobación o rechazo queda anotada en mercado_documentos_accesos.
 */
@RestController
@RequestMapping("/api/super-admin/verificaciones-mercado")
public class SuperAdminVerificacionMercadoController {

    @Autowired
    private VerificacionMercadoService verificacion;

    /** Fincas con documentos en ese estado (PENDIENTE por defecto; TODOS para ver todas). */
    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam(required = false) String estado) {
        return verificacion.solicitudes(estado);
    }

    /** Abre el documento descifrado; no se guarda en caché del navegador. */
    @GetMapping("/documentos/{id:[0-9]+}")
    public ResponseEntity<byte[]> abrir(@PathVariable Long id) {
        VerificacionMercadoService.DocumentoAbierto doc = verificacion.abrir(id, AuthContext.getUsername());
        String nombre = doc.nombre() == null || doc.nombre().isBlank() ? "documento" : doc.nombre();
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(doc.tipoContenido()))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(nombre, StandardCharsets.UTF_8).build().toString())
            .cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff")
            .body(doc.contenido());
    }

    public static class RevisionRequest {
        public String motivo;
    }

    @PostMapping("/documentos/{id:[0-9]+}/aprobar")
    public Map<String, Object> aprobar(@PathVariable Long id) {
        verificacion.revisar(id, AuthContext.getUsername(), true, null);
        return Map.of("ok", true);
    }

    @PostMapping("/documentos/{id:[0-9]+}/rechazar")
    public Map<String, Object> rechazar(@PathVariable Long id, @RequestBody RevisionRequest req) {
        verificacion.revisar(id, AuthContext.getUsername(), false, req == null ? null : req.motivo);
        return Map.of("ok", true);
    }
}
