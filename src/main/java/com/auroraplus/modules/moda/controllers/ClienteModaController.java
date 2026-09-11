package com.auroraplus.modules.moda.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.moda.entities.ClienteModa;
import com.auroraplus.modules.moda.repositories.ClienteModaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/moda/clientes")
public class ClienteModaController {

    @Autowired
    private ClienteModaRepository clienteModaRepository;

    @GetMapping
    public List<ClienteModa> listar() {
        return clienteModaRepository.findAll();
    }

    @GetMapping("/{id}")
    public ClienteModa obtener(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        return clienteModaRepository.findById(id)
            .filter(c -> tenantId != null && tenantId.equals(c.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
    }

    @PostMapping
    public ResponseEntity<ClienteModa> crear(@RequestParam Long tenantId, @RequestBody ClienteModa cliente) {
        cliente.setTenantId(tenantId);
        return ResponseEntity.ok(clienteModaRepository.save(cliente));
    }
}
