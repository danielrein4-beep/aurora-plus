package com.auroraplus.core.rrhh.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.rrhh.entities.PagoNomina;
import com.auroraplus.core.rrhh.repositories.PagoNominaRepository;
import com.auroraplus.core.rrhh.services.PagoNominaService;
import com.auroraplus.core.rrhh.services.ReciboNominaPdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Pagos de nómina ya efectuados — a diferencia de /api/rrhh/empleados (que
 * solo configura CÓMO se le paga a cada quien), esto es el botón real de
 * "pagar": deja comprobante, genera el egreso real en caja (vía
 * PagoNominaService) y produce el recibo en PDF para el empleado.
 */
@RestController
@RequestMapping("/api/rrhh/pagos-nomina")
public class PagoNominaController {

    @Autowired
    private PagoNominaService pagoNominaService;

    @Autowired
    private PagoNominaRepository pagoNominaRepository;

    @Autowired
    private ReciboNominaPdfService reciboNominaPdfService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    public static class PagoRequest {
        public Long empleadoId;
        public LocalDate periodoDesde;
        public LocalDate periodoHasta;
        public BigDecimal horasTrabajadas;
        public BigDecimal monto;
        public String moneda;
    }

    @PostMapping
    public ResponseEntity<PagoNomina> pagar(@RequestBody PagoRequest request) {
        // Pagar nómina mueve dinero real del negocio — se reserva al dueño,
        // igual que el resto de acciones financieras sensibles en Aurora+.
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = requireTenant();
        PagoNomina pago = pagoNominaService.registrarPago(tenantId, request.empleadoId, request.periodoDesde,
            request.periodoHasta, request.horasTrabajadas, request.monto, request.moneda);
        return ResponseEntity.ok(pago);
    }

    @GetMapping
    public List<PagoNomina> listar(@RequestParam(required = false) Long empleadoId) {
        Long tenantId = requireTenant();
        if (empleadoId != null) return pagoNominaRepository.findByTenantIdAndEmpleadoIdOrderByFechaPagoDesc(tenantId, empleadoId);
        return pagoNominaRepository.findByTenantIdOrderByFechaPagoDesc(tenantId);
    }

    @GetMapping(value = "/{id}/recibo.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> recibo(@PathVariable Long id) throws Exception {
        Long tenantId = requireTenant();
        PagoNomina pago = pagoNominaRepository.findById(id)
            .filter(p -> tenantId.equals(p.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Pago no encontrado"));
        var licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        byte[] pdf = reciboNominaPdfService.generarReciboPdf(pago, licencia);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"recibo-nomina-" + id + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    private Long requireTenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || tenantId <= 0) throw new RuntimeException("Tenant no autenticado");
        return tenantId;
    }
}
