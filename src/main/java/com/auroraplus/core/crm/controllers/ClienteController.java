package com.auroraplus.core.crm.controllers;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.services.ClienteService;
import com.auroraplus.core.crm.services.MetricasClienteDTO;
import com.auroraplus.modules.horeca.entities.Comanda;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** CRM básico (Fase 3): CRUD de clientes + métricas agregadas por cliente. */
@RestController
@RequestMapping("/api/crm/clientes")
public class ClienteController {

    @Autowired
    private ClienteService clienteService;

    @GetMapping
    public List<Cliente> listar(@RequestParam Long tenantId, @RequestParam(required = false) String q) {
        return (q != null && !q.isBlank()) ? clienteService.buscar(tenantId, q) : clienteService.listar(tenantId);
    }

    @GetMapping("/{id}")
    public Cliente obtener(@PathVariable Long id, @RequestParam Long tenantId) {
        return clienteService.obtener(id, tenantId);
    }

    public static class ClienteRequest {
        public String nombre;
        public String identificacionRif;
        public String telefono;
        public String correo;
    }

    @PostMapping
    public ResponseEntity<Cliente> crear(@RequestParam Long tenantId, @RequestBody ClienteRequest request) {
        return ResponseEntity.ok(clienteService.crear(tenantId, request.nombre, request.identificacionRif, request.telefono, request.correo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> editar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody ClienteRequest request) {
        return ResponseEntity.ok(clienteService.editar(id, tenantId, request.nombre, request.identificacionRif, request.telefono, request.correo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        clienteService.eliminar(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/metricas")
    public MetricasClienteDTO metricas(@PathVariable Long id, @RequestParam Long tenantId) {
        return clienteService.metricas(id, tenantId);
    }

    @GetMapping("/{id}/tickets")
    public List<Comanda> tickets(@PathVariable Long id, @RequestParam Long tenantId) {
        return clienteService.tickets(id, tenantId);
    }
}
