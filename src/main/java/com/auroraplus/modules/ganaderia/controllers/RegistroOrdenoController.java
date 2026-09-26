package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.entities.TanqueLeche;
import com.auroraplus.modules.ganaderia.entities.VentaLecheTanque;
import com.auroraplus.modules.ganaderia.services.DespachoLechePdfService;
import com.auroraplus.modules.ganaderia.services.GanaderiaLecheService;
import com.auroraplus.modules.ganaderia.services.GanaderiaReportesPdfService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Ordeño, tanque de frío y despachos de leche. La lógica vive en {@link GanaderiaLecheService};
 * aquí solo se resuelven la finca, los roles, la auditoría y las respuestas HTTP.
 */
@RestController
@RequestMapping("/api/ganaderia/ordeno")
public class RegistroOrdenoController {

    @Autowired private GanaderiaLecheService lecheService;
    @Autowired private GanaderiaReportesPdfService reportesPdfService;
    @Autowired private DespachoLechePdfService despachoLechePdfService;
    @Autowired private LicenciaTenantRepository licenciaTenantRepository;
    @Autowired private RegistroAuditoriaService auditoriaService;

    /** Mismo JSON que siempre; los campos están en {@link GanaderiaLecheService.DatosOrdeno}. */
    public static class RegistroRequest extends GanaderiaLecheService.DatosOrdeno {}
    public static class DespachoTanqueRequest extends GanaderiaLecheService.DatosDespacho {}
    public static class ConfigTanqueRequest extends GanaderiaLecheService.DatosCalibracion {}

    @PostMapping
    public ResponseEntity<RegistroOrdeno> registrar(@RequestBody RegistroRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        RegistroOrdeno guardado = lecheService.registrarOrdeno(tenantId, request);
        auditoriaService.registrar(tenantId, "GANADERIA", "CREAR", "RegistroOrdeno", guardado.getId(),
            "Registró " + guardado.getCantidadLitros() + " L para " + guardado.getAnimal().getArete() + " el " + guardado.getFecha()
                + " turno " + guardado.getTurno() + "; destino: " + guardado.getDestino());
        return ResponseEntity.ok(guardado);
    }

    @GetMapping("/animal/{animalId}")
    public List<RegistroOrdeno> historialAnimal(@PathVariable Long animalId) {
        return lecheService.historialAnimal(GanaderiaTenantAccess.requireTenant(), animalId);
    }

    /** Reporte de producción total del hato en un rango de fechas. */
    @GetMapping("/reporte")
    public Map<String, Object> reporte(@RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        return lecheService.reporte(GanaderiaTenantAccess.requireTenant(), desde, hasta);
    }

    /** Reporte PDF de ordeño: diario (desde = hasta), semanal (7 días) o cualquier rango hasta 93 días. */
    @GetMapping(value = "/reporte/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> reportePdf(@RequestParam LocalDate desde, @RequestParam LocalDate hasta) throws Exception {
        byte[] pdf = reportesPdfService.reporteOrdeno(GanaderiaTenantAccess.requireTenant(), desde, hasta);
        return pdf(pdf, "reporte-ordeno-" + desde + "_" + hasta);
    }

    /** Producción e ingreso agrupados por DIA, SEMANA o MES. */
    @GetMapping("/ingresos-periodo")
    public List<Map<String, Object>> ingresosPeriodo(@RequestParam LocalDate desde, @RequestParam LocalDate hasta,
                                                     @RequestParam(defaultValue = "DIA") String agrupacion) {
        return lecheService.ingresosPeriodo(GanaderiaTenantAccess.requireTenant(), desde, hasta, agrupacion);
    }

    @GetMapping("/tanque")
    public ResponseEntity<TanqueLeche> obtenerTanque() {
        return ResponseEntity.ok(lecheService.obtenerTanque(GanaderiaTenantAccess.requireTenant()));
    }

    @PostMapping("/tanque/despacho")
    public ResponseEntity<?> despacharTanque(@RequestBody DespachoTanqueRequest req) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        try {
            return ResponseEntity.ok(lecheService.despachar(GanaderiaTenantAccess.requireTenant(), req));
        } catch (GanaderiaLecheService.DespachoInvalido e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/tanque/ventas")
    public List<VentaLecheTanque> listarVentasTanque() {
        return lecheService.ventas(GanaderiaTenantAccess.requireTenant());
    }

    @GetMapping(value = "/tanque/ventas/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdfDespacho(@PathVariable Long id) throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        VentaLecheTanque despacho = lecheService.despachoDeLaFinca(tenantId, id);
        var licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        return pdf(despachoLechePdfService.generarNotaEntregaPdf(despacho, licencia), "nota-entrega-leche-" + id);
    }

    @PutMapping("/tanque/config")
    public ResponseEntity<TanqueLeche> configurarTanque(@RequestBody ConfigTanqueRequest req) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        return ResponseEntity.ok(lecheService.calibrarTanque(GanaderiaTenantAccess.requireTenant(), req));
    }

    private static ResponseEntity<byte[]> pdf(byte[] contenido, String nombre) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(contenido);
    }
}
