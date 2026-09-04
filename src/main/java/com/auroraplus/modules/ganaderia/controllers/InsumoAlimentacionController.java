package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.InsumoAlimentacion;
import com.auroraplus.modules.ganaderia.entities.MovimientoInsumo;
import com.auroraplus.modules.ganaderia.entities.RegistroConsumo;
import com.auroraplus.modules.ganaderia.repositories.InsumoAlimentacionRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoInsumoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaAlimentacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/alimentacion")
public class InsumoAlimentacionController {

    @Autowired
    private InsumoAlimentacionRepository insumoAlimentacionRepository;

    @Autowired
    private MovimientoInsumoRepository movimientoInsumoRepository;

    @Autowired
    private GanaderiaAlimentacionService ganaderiaAlimentacionService;

    @GetMapping("/insumos")
    public List<InsumoAlimentacion> listarInsumos() {
        return insumoAlimentacionRepository.findAll();
    }

    @PostMapping("/insumos")
    public ResponseEntity<InsumoAlimentacion> crearInsumo(@RequestParam Long tenantId, @RequestBody InsumoAlimentacion insumo) {
        insumo.setTenantId(tenantId);
        return ResponseEntity.ok(insumoAlimentacionRepository.save(insumo));
    }

    public static class EntradaRequest {
        public Long insumoId;
        public BigDecimal cantidad;
        public BigDecimal costoTotal;
        public String motivo;
    }

    @PostMapping("/entradas")
    public ResponseEntity<InsumoAlimentacion> registrarEntrada(@RequestParam Long tenantId, @RequestBody EntradaRequest request) {
        return ResponseEntity.ok(ganaderiaAlimentacionService.registrarEntrada(tenantId, request.insumoId, request.cantidad, request.costoTotal, request.motivo));
    }

    public static class ConsumoRequest {
        public Long insumoId;
        public Long potreroId;
        public LocalDate fecha;
        public BigDecimal cantidad;
    }

    @PostMapping("/consumos")
    public ResponseEntity<RegistroConsumo> registrarConsumo(@RequestParam Long tenantId, @RequestBody ConsumoRequest request) {
        return ResponseEntity.ok(ganaderiaAlimentacionService.registrarConsumo(tenantId, request.insumoId, request.potreroId, request.fecha, request.cantidad));
    }

    @GetMapping("/insumos/{insumoId}/movimientos")
    public List<MovimientoInsumo> movimientosInsumo(@PathVariable Long insumoId) {
        return movimientoInsumoRepository.findByInsumoIdOrderByFechaRegistroDesc(insumoId);
    }
}
