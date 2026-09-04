package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Chofer;
import com.auroraplus.modules.tamanacocomercial.repositories.ChoferRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.services.ChoferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tamanaco-comercial/choferes")
public class ChoferRestController {

    @Autowired
    private ChoferRepository choferRepository;

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private ChoferService choferService;

    @GetMapping("/por-cedula/{cedula}")
    public ResponseEntity<Chofer> buscarPorCedula(@PathVariable String cedula) {
        return choferService.buscarPorCedula(cedula)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/historial")
    public List<Map<String, Object>> historial() {
        List<Chofer> choferes = choferRepository.findAllByOrderByNombreCompletoAsc();
        return choferes.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("cedula", c.getCedula());
            m.put("nombreCompleto", c.getNombreCompleto());
            m.put("viajes", despachoComercialRepository.countByChoferRefId(c.getId()));
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping
    public List<Chofer> listar() {
        return choferRepository.findAllByOrderByNombreCompletoAsc();
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestParam Long tenantId, @RequestBody Chofer chofer) {
        if (chofer.getCedula() == null || chofer.getCedula().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La cédula es obligatoria"));
        }
        if (choferRepository.findByCedula(chofer.getCedula()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ya existe un chofer con esa cédula"));
        }
        chofer.setTenantId(tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(choferRepository.save(chofer));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Chofer datos) {
        return choferRepository.findById(id)
                .map(c -> {
                    if (datos.getNombreCompleto() != null) c.setNombreCompleto(datos.getNombreCompleto());
                    if (datos.getCedula() != null) c.setCedula(datos.getCedula());
                    return ResponseEntity.ok(choferRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        if (!choferRepository.existsById(id)) return ResponseEntity.notFound().build();
        choferRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
