package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
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

    // Hallazgo de seguridad corregido: el filtro de Hibernate que habilita
    // TenantInterceptor no siempre llega vivo a la sesión que ejecuta un
    // findAll() (confirmado en pruebas: apareció una mesa de otro tenant en
    // la respuesta). En vez de volver a depender de ese mecanismo frágil,
    // estos endpoints ahora piden el tenant explícito al repositorio
    // (findByTenantId / findByTenantIdAnd...), igual que ya hace el resto
    // del sistema — no requiere que ningún filtro de sesión esté "vivo".
    @GetMapping
    public List<Mesa> listar() {
        return mesaRepository.findByTenantId(TenantContext.getCurrentTenant());
    }

    @PostMapping
    public ResponseEntity<Mesa> crear(@RequestParam Long tenantId, @RequestBody Mesa mesa) {
        mesa.setTenantId(tenantId);
        return ResponseEntity.ok(mesaRepository.save(mesa));
    }

    public static class EditarMesaRequest {
        public Integer numero;
        public Integer capacidad;
        public String zona;
        public String forma;
    }

    /** Edita número, capacidad, zona o forma de una mesa ya existente — sin tocar su posición en el plano. */
    @PutMapping("/{id}")
    public ResponseEntity<Mesa> editar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody EditarMesaRequest request) {
        Mesa mesa = mesaRepository.findById(id).orElseThrow(() -> new RuntimeException("Mesa no encontrada"));
        if (!mesa.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Mesa no pertenece a este tenant");
        }
        if (request.numero != null) mesa.setNumero(request.numero);
        if (request.capacidad != null) mesa.setCapacidad(request.capacidad);
        if (request.zona != null) mesa.setZona(request.zona);
        if (request.forma != null) mesa.setForma(request.forma);
        return ResponseEntity.ok(mesaRepository.save(mesa));
    }

    /** Elimina una mesa — rechaza si tiene una comanda ABIERTA para no perder el rastro de una cuenta en curso. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        Mesa mesa = mesaRepository.findById(id).orElseThrow(() -> new RuntimeException("Mesa no encontrada"));
        if (!mesa.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Mesa no pertenece a este tenant");
        }
        boolean tieneComandaAbierta = comandaRepository.findByTenantIdAndEstadoOrderByFechaAperturaDesc(tenantId, Comanda.EstadoComanda.ABIERTA).stream()
            .anyMatch(c -> mesa.getNumero().equals(c.getNumeroMesa()));
        if (tieneComandaAbierta) {
            throw new RuntimeException("No se puede eliminar la mesa " + mesa.getNumero() + ": tiene una comanda abierta. Ciérrala primero.");
        }
        mesaRepository.delete(mesa);
        return ResponseEntity.noContent().build();
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
        Long tenantId = TenantContext.getCurrentTenant();
        List<Mesa> mesas = mesaRepository.findByTenantId(tenantId);
        List<Comanda> comandasAbiertas = comandaRepository.findByTenantIdAndEstadoOrderByFechaAperturaDesc(tenantId, Comanda.EstadoComanda.ABIERTA);

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
