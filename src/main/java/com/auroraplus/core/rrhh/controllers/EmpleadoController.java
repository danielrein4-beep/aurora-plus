package com.auroraplus.core.rrhh.controllers;

import com.auroraplus.core.rrhh.entities.Empleado;
import com.auroraplus.core.rrhh.repositories.EmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController("rrhhEmpleadoController")
@RequestMapping("/api/rrhh/empleados")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    private static final Set<String> TIPOS_CONTROL_VALIDOS = Set.of("POR_HORA", "SALARIO_FIJO", "SOLO_CONTROL");

    private void validar(Empleado empleado) {
        String tipo = empleado.getTipoControl();
        if (tipo == null || tipo.isBlank()) {
            empleado.setTipoControl("SOLO_CONTROL");
            tipo = "SOLO_CONTROL";
        }
        if (!TIPOS_CONTROL_VALIDOS.contains(tipo)) {
            throw new RuntimeException("tipoControl inválido. Use: " + TIPOS_CONTROL_VALIDOS);
        }
        if ("POR_HORA".equals(tipo) && empleado.getTarifaPorHora() == null) {
            throw new RuntimeException("Un empleado POR_HORA requiere tarifaPorHora");
        }
    }

    @GetMapping
    public List<Empleado> listar() {
        return empleadoRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Empleado> crear(@RequestParam Long tenantId, @RequestBody Empleado empleado) {
        empleado.setTenantId(tenantId);
        validar(empleado);
        return ResponseEntity.ok(empleadoRepository.save(empleado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Empleado> actualizar(@PathVariable Long id, @RequestBody Empleado datos) {
        Empleado empleado = empleadoRepository.findById(id).orElseThrow(() -> new RuntimeException("Empleado no encontrado"));
        empleado.setNombre(datos.getNombre());
        empleado.setCedula(datos.getCedula());
        empleado.setCargo(datos.getCargo());
        empleado.setTipoControl(datos.getTipoControl());
        empleado.setTarifaPorHora(datos.getTarifaPorHora());
        if (datos.getActivo() != null) empleado.setActivo(datos.getActivo());
        validar(empleado);
        return ResponseEntity.ok(empleadoRepository.save(empleado));
    }
}
