package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.FincaGanaderia;
import com.auroraplus.modules.ganaderia.repositories.FincaGanaderiaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/** Ubicación canónica de la finca, aislada estrictamente por TenantContext. */
@RestController
@RequestMapping("/api/ganaderia/finca")
public class FincaGanaderiaController {
    private final FincaGanaderiaRepository fincaRepository;
    private final RegistroAuditoriaService auditoria;

    public FincaGanaderiaController(FincaGanaderiaRepository fincaRepository, RegistroAuditoriaService auditoria) {
        this.fincaRepository = fincaRepository;
        this.auditoria = auditoria;
    }

    public static class FincaRequest {
        public String nombre;
        public BigDecimal latitud;
        public BigDecimal longitud;
        public String puntosInteresJson;
    }

    @GetMapping
    public ResponseEntity<FincaGanaderia> obtener() {
        return fincaRepository.findByTenantId(GanaderiaTenantAccess.requireTenant())
            .map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public ResponseEntity<FincaGanaderia> guardar(@RequestBody FincaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        if (request.nombre == null || request.nombre.isBlank()) throw new IllegalArgumentException("Indique el nombre de la finca");
        if (request.latitud == null || request.longitud == null
            || request.latitud.compareTo(BigDecimal.valueOf(-90)) < 0 || request.latitud.compareTo(BigDecimal.valueOf(90)) > 0
            || request.longitud.compareTo(BigDecimal.valueOf(-180)) < 0 || request.longitud.compareTo(BigDecimal.valueOf(180)) > 0) {
            throw new IllegalArgumentException("Las coordenadas de la finca no son válidas");
        }
        FincaGanaderia finca = fincaRepository.findByTenantId(tenantId).orElseGet(FincaGanaderia::new);
        boolean nueva = finca.getId() == null;
        finca.setTenantId(tenantId);
        finca.setNombre(request.nombre.trim());
        finca.setLatitud(request.latitud);
        finca.setLongitud(request.longitud);
        finca.setPuntosInteresJson(request.puntosInteresJson == null || request.puntosInteresJson.isBlank() ? "[]" : request.puntosInteresJson);
        finca.setActualizadoEn(LocalDateTime.now());
        FincaGanaderia guardada = fincaRepository.save(finca);
        auditoria.registrar(tenantId, "GANADERIA", nueva ? "CREAR" : "EDITAR", "Finca", guardada.getId(),
            (nueva ? "Registró" : "Actualizó") + " la finca '" + guardada.getNombre() + "' y su ubicación geográfica");
        return ResponseEntity.ok(guardada);
    }
}
