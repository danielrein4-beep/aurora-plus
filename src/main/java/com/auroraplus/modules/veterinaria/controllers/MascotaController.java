package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.Mascota;
import com.auroraplus.modules.veterinaria.services.MascotaService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/mascotas")
public class MascotaController {

    @Autowired
    private MascotaService mascotaService;

    @Autowired
    private EntityManager entityManager;

    private void asegurarFiltroTenant() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
    }

    @GetMapping
    public List<Mascota> listar(
            @RequestParam(required = false) Long tenantId,
            @RequestParam(required = false) Long propietarioId,
            @RequestParam(required = false) String buscar) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        asegurarFiltroTenant();
        if (propietarioId != null) {
            return mascotaService.listarPorPropietario(tenantActivo, propietarioId);
        }
        return mascotaService.buscar(tenantActivo, buscar);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Mascota> obtener(@PathVariable Long id, @RequestParam(required = false) Long tenantId) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        asegurarFiltroTenant();
        return mascotaService.obtenerPorId(tenantActivo, id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/microchip/{microchip}")
    public ResponseEntity<Mascota> buscarPorMicrochip(@PathVariable String microchip, @RequestParam(required = false) Long tenantId) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        asegurarFiltroTenant();
        return mascotaService.obtenerPorMicrochip(tenantActivo, microchip)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Mascota> registrar(@RequestParam(required = false) Long tenantId, @RequestBody Mascota mascota) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        mascota.setId(null);
        return ResponseEntity.ok(mascotaService.registrarOActualizar(tenantActivo, mascota));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Mascota> actualizar(@PathVariable Long id, @RequestParam(required = false) Long tenantId, @RequestBody Mascota datos) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        datos.setId(id);
        return ResponseEntity.ok(mascotaService.registrarOActualizar(tenantActivo, datos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        asegurarFiltroTenant();
        mascotaService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/fallecido")
    public ResponseEntity<Void> marcarFallecido(@PathVariable Long id, @RequestParam boolean fallecido) {
        asegurarFiltroTenant();
        mascotaService.marcarFallecido(id, fallecido);
        return ResponseEntity.noContent().build();
    }
}
