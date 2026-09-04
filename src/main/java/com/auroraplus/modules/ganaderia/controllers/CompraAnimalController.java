package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.CompraAnimal;
import com.auroraplus.modules.ganaderia.repositories.CompraAnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaCompraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/compras")
public class CompraAnimalController {

    @Autowired
    private GanaderiaCompraService ganaderiaCompraService;

    @Autowired
    private CompraAnimalRepository compraAnimalRepository;

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<GanaderiaCompraService.ItemCompraAnimal> items;
    }

    @GetMapping
    public List<CompraAnimal> listar() {
        return compraAnimalRepository.findAllByOrderByFechaCompraDesc();
    }

    @PostMapping
    public ResponseEntity<CompraAnimal> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        return ResponseEntity.ok(ganaderiaCompraService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, request.items));
    }
}
