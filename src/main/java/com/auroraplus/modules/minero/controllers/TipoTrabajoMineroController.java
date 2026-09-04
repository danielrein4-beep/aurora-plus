package com.auroraplus.modules.minero.controllers;

import com.auroraplus.modules.minero.entities.TipoTrabajoMinero;
import com.auroraplus.modules.minero.repositories.TipoTrabajoMineroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Catálogo de roles de destajo (PICADOR, CARRETERO, FRENTERO, TRABAJO_ROCA, NUEVO_FRENTE...) con su tarifa propia. */
@RestController
@RequestMapping("/api/minero/tipos-trabajo")
public class TipoTrabajoMineroController {

    @Autowired
    private TipoTrabajoMineroRepository tipoTrabajoMineroRepository;

    @GetMapping
    public List<TipoTrabajoMinero> listar() {
        return tipoTrabajoMineroRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<TipoTrabajoMinero> crear(@RequestParam Long tenantId, @RequestBody TipoTrabajoMinero tipoTrabajo) {
        tipoTrabajo.setTenantId(tenantId);
        return ResponseEntity.ok(tipoTrabajoMineroRepository.save(tipoTrabajo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoTrabajoMinero> actualizar(@PathVariable Long id, @RequestBody TipoTrabajoMinero datos) {
        TipoTrabajoMinero tipoTrabajo = tipoTrabajoMineroRepository.findById(id).orElseThrow(() -> new RuntimeException("Tipo de trabajo no encontrado"));
        tipoTrabajo.setNombre(datos.getNombre());
        tipoTrabajo.setUnidadMedida(datos.getUnidadMedida());
        tipoTrabajo.setTarifaPorUnidad(datos.getTarifaPorUnidad());
        return ResponseEntity.ok(tipoTrabajoMineroRepository.save(tipoTrabajo));
    }
}
