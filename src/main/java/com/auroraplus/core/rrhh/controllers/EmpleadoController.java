package com.auroraplus.core.rrhh.controllers;

import com.auroraplus.core.config.TenantContext;
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
    private static final Set<String> PERIODICIDADES_VALIDAS = Set.of("SEMANAL", "QUINCENAL", "MENSUAL");

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
        if ("SALARIO_FIJO".equals(tipo) && empleado.getSalarioFijo() == null) {
            throw new RuntimeException("Un empleado SALARIO_FIJO requiere salarioFijo");
        }
        if (empleado.getMonedaSalario() == null || empleado.getMonedaSalario().isBlank()) {
            empleado.setMonedaSalario("USD");
        }
        if (empleado.getPeriodicidadPago() == null || empleado.getPeriodicidadPago().isBlank()) {
            empleado.setPeriodicidadPago("MENSUAL");
        } else if (!PERIODICIDADES_VALIDAS.contains(empleado.getPeriodicidadPago())) {
            throw new RuntimeException("periodicidadPago inválida. Use: " + PERIODICIDADES_VALIDAS);
        }
    }

    @GetMapping
    public List<Empleado> listar() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || tenantId <= 0) throw new RuntimeException("Tenant no autenticado");
        return empleadoRepository.findByTenantId(tenantId);
    }

    @PostMapping
    public ResponseEntity<Empleado> crear(@RequestBody Empleado empleado) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || tenantId <= 0) throw new RuntimeException("Tenant no autenticado");
        empleado.setId(null);
        empleado.setTenantId(tenantId);
        validar(empleado);
        return ResponseEntity.ok(empleadoRepository.save(empleado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Empleado> actualizar(@PathVariable Long id, @RequestBody Empleado datos) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || tenantId <= 0) throw new RuntimeException("Tenant no autenticado");
        Empleado empleado = empleadoRepository.findById(id)
            .filter(e -> tenantId != null && tenantId.equals(e.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));
        empleado.setNombre(datos.getNombre());
        empleado.setCedula(datos.getCedula());
        empleado.setCargo(datos.getCargo());
        empleado.setTipoControl(datos.getTipoControl());
        empleado.setTarifaPorHora(datos.getTarifaPorHora());
        empleado.setSalarioFijo(datos.getSalarioFijo());
        empleado.setMonedaSalario(datos.getMonedaSalario());
        empleado.setPeriodicidadPago(datos.getPeriodicidadPago());
        if (datos.getActivo() != null) empleado.setActivo(datos.getActivo());
        validar(empleado);
        return ResponseEntity.ok(empleadoRepository.save(empleado));
    }
}
