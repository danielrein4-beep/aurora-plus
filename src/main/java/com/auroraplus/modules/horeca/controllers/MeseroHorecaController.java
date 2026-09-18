package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.rrhh.entities.Empleado;
import com.auroraplus.core.rrhh.repositories.EmpleadoRepository;
import com.auroraplus.core.rrhh.repositories.RegistroAsistenciaRepository;
import com.auroraplus.modules.horeca.entities.MeseroHoreca;
import com.auroraplus.modules.horeca.repositories.MeseroHorecaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horeca/meseros")
public class MeseroHorecaController {

    @Autowired
    private MeseroHorecaRepository meseroHorecaRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private RegistroAsistenciaRepository registroAsistenciaRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    // DTO de salida: el mesero tal cual + si está fichado AHORA MISMO (cuando
    // tiene empleadoId vinculado) — se resuelve acá, contra el reloj checador
    // real de RRHH, en vez de duplicar el estado dentro de MeseroHoreca.
    public static class MeseroConEstado {
        public MeseroHoreca mesero;
        public boolean enTurno;
        public String cargoEmpleado;
        public MeseroConEstado(MeseroHoreca mesero, boolean enTurno, String cargoEmpleado) {
            this.mesero = mesero; this.enTurno = enTurno; this.cargoEmpleado = cargoEmpleado;
        }
    }

    // Explícito por tenantId (no el filtro de Hibernate solo) — mismo criterio
    // de seguridad que ProveedorHorecaController/MesaController.
    @GetMapping
    public List<MeseroConEstado> listar() {
        return meseroHorecaRepository.findByTenantId(TenantContext.getCurrentTenant()).stream()
            .map(m -> {
                if (m.getEmpleadoId() == null) return new MeseroConEstado(m, false, null);
                boolean enTurno = registroAsistenciaRepository.findTurnoAbierto(m.getEmpleadoId()).isPresent();
                String cargo = empleadoRepository.findById(m.getEmpleadoId()).map(Empleado::getCargo).orElse(null);
                return new MeseroConEstado(m, enTurno, cargo);
            })
            .toList();
    }

    public static class MeseroRequest {
        public String nombre;
        public String telefono;
        public Long empleadoId;
    }

    @PostMapping
    public ResponseEntity<MeseroHoreca> crear(@RequestBody MeseroRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if (request.nombre == null || request.nombre.isBlank()) {
            throw new RuntimeException("El nombre del mesero es obligatorio");
        }
        MeseroHoreca mesero = new MeseroHoreca();
        mesero.setTenantId(TenantContext.getCurrentTenant());
        mesero.setNombre(request.nombre.trim());
        mesero.setTelefono(request.telefono != null && !request.telefono.isBlank() ? request.telefono.trim() : null);
        mesero.setEmpleadoId(resolverEmpleadoId(request.empleadoId));
        MeseroHoreca guardado = meseroHorecaRepository.save(mesero);
        auditoriaService.registrar(mesero.getTenantId(), "HORECA", "CREAR", "Mesero", guardado.getId(), "Creó al mesero: " + guardado.getNombre());
        return ResponseEntity.ok(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MeseroHoreca> editar(@PathVariable Long id, @RequestBody MeseroRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        MeseroHoreca mesero = meseroHorecaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Mesero no encontrado"));
        if (!mesero.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Mesero no pertenece a este tenant");
        }
        if (request.nombre != null && !request.nombre.isBlank()) mesero.setNombre(request.nombre.trim());
        mesero.setTelefono(request.telefono != null && !request.telefono.isBlank() ? request.telefono.trim() : null);
        mesero.setEmpleadoId(resolverEmpleadoId(request.empleadoId));
        return ResponseEntity.ok(meseroHorecaRepository.save(mesero));
    }

    // Un empleadoId debe pertenecer al mismo tenant — sin este chequeo, un
    // mesero podría quedar "vinculado" al reloj checador de otro negocio.
    private Long resolverEmpleadoId(Long empleadoId) {
        if (empleadoId == null) return null;
        Long tenantId = TenantContext.getCurrentTenant();
        Empleado empleado = empleadoRepository.findById(empleadoId)
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));
        if (!empleado.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Empleado no pertenece a este tenant");
        }
        return empleadoId;
    }

    // "Eliminar" desactiva en vez de borrar — un mesero que ya atendió
    // comandas no se puede borrar sin perder el nombre en su historial (que
    // vive como texto libre en Comanda.mesero, no una FK); desactivado
    // simplemente deja de aparecer como sugerencia al abrir una comanda nueva.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        MeseroHoreca mesero = meseroHorecaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Mesero no encontrado"));
        if (!mesero.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Mesero no pertenece a este tenant");
        }
        mesero.setActivo(false);
        meseroHorecaRepository.save(mesero);
        auditoriaService.registrar(tenantId, "HORECA", "ELIMINAR", "Mesero", id, "Desactivó al mesero: " + mesero.getNombre());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/reactivar")
    public ResponseEntity<MeseroHoreca> reactivar(@PathVariable Long id) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        MeseroHoreca mesero = meseroHorecaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Mesero no encontrado"));
        if (!mesero.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Mesero no pertenece a este tenant");
        }
        mesero.setActivo(true);
        return ResponseEntity.ok(meseroHorecaRepository.save(mesero));
    }
}
