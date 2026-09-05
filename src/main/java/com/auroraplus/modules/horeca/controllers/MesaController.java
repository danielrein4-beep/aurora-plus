package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.Mesa;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.MesaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/horeca/mesas-fisicas")
public class MesaController {

    @Autowired
    private MesaRepository mesaRepository;

    @Autowired
    private ComandaRepository comandaRepository;

    @GetMapping
    public List<Mesa> listar() {
        return mesaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Mesa> crear(@RequestParam Long tenantId, @RequestBody Mesa mesa) {
        mesa.setTenantId(tenantId);
        return ResponseEntity.ok(mesaRepository.save(mesa));
    }

    public static class PosicionRequest {
        public Integer posX;
        public Integer posY;
        public Integer ancho;
        public Integer alto;
        public String forma;
    }

    /** Ubica/redimensiona la mesa en el plano — pensado para un arrastrar-y-soltar en el frontend, sin tocar el resto de sus datos (número, capacidad, zona). */
    @PutMapping("/{id}/posicion")
    public ResponseEntity<Mesa> actualizarPosicion(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody PosicionRequest request) {
        Mesa mesa = mesaRepository.findById(id).orElseThrow(() -> new RuntimeException("Mesa no encontrada"));
        if (!mesa.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Mesa no pertenece a este tenant");
        }
        mesa.setPosX(request.posX);
        mesa.setPosY(request.posY);
        if (request.ancho != null) mesa.setAncho(request.ancho);
        if (request.alto != null) mesa.setAlto(request.alto);
        if (request.forma != null) mesa.setForma(request.forma);
        return ResponseEntity.ok(mesaRepository.save(mesa));
    }

    /** Mapa de mesas: cada mesa con su estado (LIBRE/OCUPADA) según si tiene una comanda ABIERTA. */
    @GetMapping("/mapa")
    public List<Map<String, Object>> mapa() {
        List<Mesa> mesas = mesaRepository.findAll();
        List<Comanda> comandasAbiertas = comandaRepository.findAll().stream()
            .filter(c -> c.getEstado() == Comanda.EstadoComanda.ABIERTA)
            .toList();

        return mesas.stream().map(mesa -> {
            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("mesa", mesa);
            // getNumeroMesa() es null en comandas de DELIVERY_PROPIO/RECOGER_EN_TIENDA (sin mesa física) — se excluyen del mapa.
            Comanda comandaAbierta = comandasAbiertas.stream()
                .filter(c -> mesa.getNumero().equals(c.getNumeroMesa()))
                .findFirst().orElse(null);
            entrada.put("estado", comandaAbierta != null ? "OCUPADA" : "LIBRE");
            entrada.put("comandaAbierta", comandaAbierta);
            return entrada;
        }).toList();
    }
}
