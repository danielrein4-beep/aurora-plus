package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.InsumoAlimentacion;
import com.auroraplus.modules.ganaderia.entities.MovimientoInsumo;
import com.auroraplus.modules.ganaderia.entities.RegistroConsumo;
import com.auroraplus.modules.ganaderia.repositories.InsumoAlimentacionRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoInsumoRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroConsumoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaAlimentacionService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
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

    @Autowired
    private RegistroConsumoRepository registroConsumoRepository;

    @GetMapping("/insumos")
    public List<InsumoAlimentacion> listarInsumos() {
        return insumoAlimentacionRepository.findByTenantId(GanaderiaTenantAccess.requireTenant());
    }

    @PostMapping("/insumos")
    public ResponseEntity<InsumoAlimentacion> crearInsumo(@RequestBody InsumoAlimentacion insumo) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        insumo.setId(null);
        if (insumo.getNombre() == null || insumo.getNombre().isBlank() || insumo.getTipo() == null || insumo.getUnidadMedida() == null) {
            throw new IllegalArgumentException("Nombre, tipo y unidad de medida son obligatorios para el insumo");
        }
        insumo.setStockActual(java.math.BigDecimal.ZERO);
        insumo.setTenantId(tenantId);
        return ResponseEntity.ok(insumoAlimentacionRepository.save(insumo));
    }

    public static class EntradaRequest {
        public Long insumoId;
        public BigDecimal cantidad;
        public BigDecimal costoTotal;
        public String monedaPago;
        public BigDecimal montoPagado;
        public String motivo;
    }

    @PostMapping("/entradas")
    public ResponseEntity<InsumoAlimentacion> registrarEntrada(@RequestBody EntradaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ResponseEntity.ok(ganaderiaAlimentacionService.registrarEntrada(tenantId, request.insumoId, request.cantidad,
            request.costoTotal, request.monedaPago, request.montoPagado, request.motivo));
    }

    public static class ConsumoRequest {
        public Long insumoId;
        public Long potreroId;
        public LocalDate fecha;
        public BigDecimal cantidad;
    }

    @PostMapping("/consumos")
    public ResponseEntity<RegistroConsumo> registrarConsumo(@RequestBody ConsumoRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ResponseEntity.ok(ganaderiaAlimentacionService.registrarConsumo(tenantId, request.insumoId, request.potreroId, request.fecha, request.cantidad));
    }

    /** Raciones dadas en los potreros en los últimos días (por defecto 90). */
    @GetMapping("/consumos")
    public List<RegistroConsumo> listarConsumos(@RequestParam(required = false) Integer dias) {
        int rango = dias == null || dias <= 0 ? 90 : Math.min(dias, 730);
        return registroConsumoRepository.findByTenantIdAndFechaGreaterThanEqualOrderByFechaDescIdDesc(
            GanaderiaTenantAccess.requireTenant(), LocalDate.now().minusDays(rango));
    }

    @GetMapping("/insumos/{insumoId}/movimientos")
    public List<MovimientoInsumo> movimientosInsumo(@PathVariable Long insumoId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        insumoAlimentacionRepository.findById(insumoId).filter(i -> tenantId.equals(i.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        return movimientoInsumoRepository.findByInsumoIdOrderByFechaRegistroDesc(insumoId);
    }
}
