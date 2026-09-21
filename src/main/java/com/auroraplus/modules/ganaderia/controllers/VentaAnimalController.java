package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.VentaAnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaVentaService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import com.auroraplus.modules.ganaderia.services.VentaAnimalPdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/ventas")
public class VentaAnimalController {

    @Autowired
    private GanaderiaVentaService ganaderiaVentaService;

    @Autowired
    private VentaAnimalRepository ventaAnimalRepository;

    @Autowired
    private VentaAnimalPdfService ventaAnimalPdfService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    public static class VentaRequest {
        public String numeroTicket;
        public String comprador;
        public List<GanaderiaVentaService.ItemVentaAnimal> items;
        public String monedaPago; // opcional, si el comprador paga en moneda distinta a la base del tenant
        public BigDecimal montoRecibido;
        public String claveIdempotencia; // opcional, ver IdempotenciaService
    }

    // ── P0: tenant NUNCA viene por query/body/header — siempre de TenantContext/JWT ──

    @GetMapping
    public List<VentaAnimal> listar() {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ventaAnimalRepository.findByTenantIdOrderByFechaDesc(tenantId);
    }

    @PostMapping
    public ResponseEntity<VentaAnimal> registrar(@RequestBody VentaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        VentaAnimal venta = ganaderiaVentaService.registrarVenta(tenantId, request.numeroTicket, request.comprador,
            request.items, request.monedaPago, request.montoRecibido, request.claveIdempotencia);
        auditoriaService.registrar(tenantId, "GANADERIA", "CREAR", "VentaAnimal", venta.getId(), "Registró una venta — comprador: " + request.comprador);
        return ResponseEntity.ok(venta);
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        VentaAnimal venta = ventaAnimalRepository.findById(id)
            .filter(v -> tenantId.equals(v.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        byte[] pdf = ventaAnimalPdfService.generarLiquidacionPdf(venta, licencia);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"liquidacion-" + venta.getNumeroTicket() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
