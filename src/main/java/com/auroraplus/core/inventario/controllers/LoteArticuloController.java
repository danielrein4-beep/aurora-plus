package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.inventario.entities.LoteArticulo;
import com.auroraplus.core.inventario.repositories.LoteArticuloRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

// Trazabilidad de lotes por fecha de caducidad, a nivel de core.inventario
// para que cualquier vertical lo use, no solo Horeca.
@RestController
@RequestMapping("/api/inventario/lotes")
public class LoteArticuloController {

    @Autowired
    private LoteArticuloRepository loteArticuloRepository;

    @GetMapping
    public List<LoteArticulo> listarPorArticulo(@RequestParam Long articuloId) {
        return loteArticuloRepository.findByArticuloId(articuloId);
    }

    // Lotes ya vencidos o que vencen dentro de "diasAnticipacion" días (default 7).
    // No incluye artículos sin fecha_vencimiento (no perecederos).
    @GetMapping("/alertas-vencimiento")
    public List<LoteArticulo> alertasVencimiento(@RequestParam Long tenantId,
                                                  @RequestParam(required = false, defaultValue = "7") Integer diasAnticipacion) {
        LocalDate fechaLimite = LocalDate.now().plusDays(diasAnticipacion);
        return loteArticuloRepository
            .findByTenantIdAndFechaVencimientoIsNotNullAndFechaVencimientoLessThanEqualOrderByFechaVencimientoAsc(tenantId, fechaLimite);
    }
}
