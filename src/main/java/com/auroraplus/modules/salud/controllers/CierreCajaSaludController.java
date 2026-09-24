package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CierreCajaSalud;
import com.auroraplus.modules.salud.repositories.CierreCajaSaludRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Historial de cierres de caja de Mediclinic, guardado en el servidor para que el médico y la
 * secretaria lo vean desde cualquier computadora (antes vivía en el navegador de quien cerraba).
 */
@RestController
@RequestMapping("/api/salud/cierres-caja")
public class CierreCajaSaludController {

    @Autowired private CierreCajaSaludRepository repository;
    @Autowired private ObjectMapper objectMapper;

    public record CierreVista(Long id, LocalDate fecha, JsonNode datos, String creadoPor) {}

    @GetMapping
    public List<CierreVista> listar() {
        Long tenantId = TenantContext.getCurrentTenant();
        return repository.findTop200ByTenantIdOrderByCreadoEnDesc(tenantId).stream().map(this::vista).toList();
    }

    @PostMapping
    public CierreVista guardar(@RequestBody JsonNode datos) throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio");
        CierreCajaSalud c = new CierreCajaSalud();
        c.setTenantId(tenantId);
        LocalDate fecha = LocalDate.now();
        if (datos.hasNonNull("fecha")) {
            try { fecha = LocalDate.parse(datos.get("fecha").asText().substring(0, 10)); } catch (Exception ignorada) { /* fecha libre: se usa hoy */ }
        }
        c.setFecha(fecha);
        c.setDatosJson(objectMapper.writeValueAsString(datos));
        c.setCreadoPor(AuthContext.getUsername());
        return vista(repository.save(c));
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<Map<String, Object>> eliminar(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        CierreCajaSalud c = repository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new RuntimeException("Cierre no encontrado"));
        repository.delete(c);
        return ResponseEntity.ok(Map.of("eliminado", id));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> vaciar() {
        Long tenantId = TenantContext.getCurrentTenant();
        List<CierreCajaSalud> todos = repository.findByTenantId(tenantId);
        repository.deleteAll(todos);
        return ResponseEntity.ok(Map.of("eliminados", todos.size()));
    }

    private CierreVista vista(CierreCajaSalud c) {
        JsonNode datos;
        try { datos = objectMapper.readTree(c.getDatosJson()); } catch (Exception e) { datos = objectMapper.createObjectNode(); }
        return new CierreVista(c.getId(), c.getFecha(), datos, c.getCreadoPor());
    }
}
