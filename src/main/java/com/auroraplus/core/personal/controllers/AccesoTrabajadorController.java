package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.PermisoPersonal;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import com.auroraplus.core.personal.repositories.PermisoPersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Vincula un usuario del negocio con su ficha de trabajador para que pueda marcar SU entrada y
 * SU salida (ver AsistenciaController /mia). Antes no había forma de crear ese vínculo, así que
 * ningún trabajador podía marcarse. Solo el dueño lo da o lo quita.
 */
@RestController
@RequestMapping("/api/personal/accesos")
public class AccesoTrabajadorController {

    @Autowired private PermisoPersonalRepository permisoRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    public record AccesoTrabajador(Long usuarioId, String username) {}

    @GetMapping("/empleado/{empleadoId:[0-9]+}")
    public ResponseEntity<AccesoTrabajador> ver(@PathVariable Long empleadoId) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = tenant();
        List<PermisoPersonal> vinculos = permisoRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId);
        if (vinculos.isEmpty()) return ResponseEntity.noContent().build();
        Long usuarioId = vinculos.get(0).getUsuarioId();
        String username = usuarioRepository.findById(usuarioId).filter(u -> tenantId.equals(u.getTenantId()))
            .map(Usuario::getUsername).orElse(null);
        return ResponseEntity.ok(new AccesoTrabajador(usuarioId, username));
    }

    @PutMapping("/empleado/{empleadoId:[0-9]+}")
    @Transactional
    public AccesoTrabajador vincular(@PathVariable Long empleadoId, @RequestBody Map<String, Long> body) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = tenant();
        Long usuarioId = body != null ? body.get("usuarioId") : null;
        if (usuarioId == null) throw new RuntimeException("Elige el usuario del trabajador");
        var empleado = empleadoRepository.findByTenantIdAndId(tenantId, empleadoId)
            .orElseThrow(() -> new RuntimeException("Trabajador no encontrado"));
        if (empleado.getFechaEgreso() != null) throw new RuntimeException("Este trabajador ya no está activo");
        Usuario usuario = usuarioRepository.findById(usuarioId).filter(u -> tenantId.equals(u.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Ese usuario no pertenece a este negocio"));
        if (Usuario.Rol.DUENO_ADMIN.equals(usuario.getRol())) {
            throw new RuntimeException("El usuario del dueño no se vincula a un trabajador");
        }

        // Un trabajador tiene un solo usuario para marcar: se suelta cualquier vínculo anterior.
        for (PermisoPersonal anterior : permisoRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId)) {
            if (anterior.getUsuarioId().equals(usuarioId)) continue;
            soltar(anterior);
        }
        PermisoPersonal permiso = permisoRepository.findByTenantIdAndUsuarioId(tenantId, usuarioId).orElseGet(() -> {
            PermisoPersonal nuevo = new PermisoPersonal();
            nuevo.setTenantId(tenantId);
            nuevo.setUsuarioId(usuarioId);
            nuevo.setRol(PermisoPersonal.RolPersonal.EMPLEADO);
            return nuevo;
        });
        permiso.setEmpleadoId(empleadoId);
        permisoRepository.save(permiso);
        return new AccesoTrabajador(usuarioId, usuario.getUsername());
    }

    @DeleteMapping("/empleado/{empleadoId:[0-9]+}")
    @Transactional
    public ResponseEntity<Map<String, Object>> quitar(@PathVariable Long empleadoId) {
        AuthContext.exigirRol("DUENO_ADMIN");
        for (PermisoPersonal p : permisoRepository.findByTenantIdAndEmpleadoId(tenant(), empleadoId)) soltar(p);
        return ResponseEntity.ok(Map.of("quitado", true));
    }

    /** Un permiso solo de marcaje se borra; si además tiene otro rol (RRHH, supervisor...), solo se desvincula. */
    private void soltar(PermisoPersonal permiso) {
        if (permiso.getRol() == PermisoPersonal.RolPersonal.EMPLEADO) permisoRepository.delete(permiso);
        else {
            permiso.setEmpleadoId(null);
            permisoRepository.save(permiso);
        }
    }

    private static Long tenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio asociado");
        return tenantId;
    }
}
