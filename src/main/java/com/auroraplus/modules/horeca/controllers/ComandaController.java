package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Consulta de comandas — antes solo existían endpoints para crearlas y
 * modificarlas (HorecaController), pero ninguno para listarlas ni para leer
 * los ítems de una comanda puntual. El KDS por estación (GET
 * /api/horeca/mesas/kds/{estacion}) y el mapa de mesas (solo comandas
 * ABIERTAS) eran las únicas ventanas indirectas al estado de una comanda —
 * el frontend no tenía forma de recuperar una comanda cerrada, ni de
 * refrescar sus ítems tras perder el estado local (recarga de página,
 * otro dispositivo, etc.).
 */
@RestController
@RequestMapping("/api/horeca/comandas")
public class ComandaController {

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private ItemComandaRepository itemComandaRepository;

    /** Historial de comandas del tenant, más recientes primero. Filtra por estado si se indica. */
    @GetMapping
    public List<Comanda> listar(@RequestParam Long tenantId,
                                 @RequestParam(required = false) Comanda.EstadoComanda estado) {
        return estado != null
            ? comandaRepository.findByTenantIdAndEstadoOrderByFechaAperturaDesc(tenantId, estado)
            : comandaRepository.findByTenantIdOrderByFechaAperturaDesc(tenantId);
    }

    @GetMapping("/{id}")
    public Comanda obtener(@PathVariable Long id, @RequestParam Long tenantId) {
        Comanda comanda = comandaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));
        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        return comanda;
    }

    /** Ítems de una comanda puntual — lo que el ticket PDF ya leía internamente, ahora también disponible para refrescar la UI. */
    @GetMapping("/{id}/items")
    public List<ItemComanda> items(@PathVariable Long id, @RequestParam Long tenantId) {
        Comanda comanda = comandaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));
        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        return itemComandaRepository.findByComandaId(id);
    }
}
