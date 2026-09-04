package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.dto.NominaPagoRequestDTO;
import com.auroraplus.modules.tamanacocomercial.dto.NominaSemanaResponseDTO;
import com.auroraplus.modules.tamanacocomercial.entities.CierreSemana;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.services.CierreSemanaService;
import com.auroraplus.modules.tamanacocomercial.services.NominaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/tamanaco-comercial/nomina")
public class NominaController {

    @Autowired
    private NominaService nominaService;

    @Autowired
    private CierreSemanaService cierreSemanaService;

    @GetMapping("/semana")
    public ResponseEntity<?> calcularSemana(@RequestParam Long tenantId, @RequestParam(required = false) String fecha) {
        try {
            NominaSemanaResponseDTO respuesta = nominaService.calcularSemana(tenantId, fecha);
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "No se pudo calcular la nómina de la semana: " + e.getMessage()));
        }
    }

    @GetMapping("/cierre-estado")
    public ResponseEntity<?> getEstadoCierre(@RequestParam(required = false) String fecha) {
        LocalDate f = (fecha != null && !fecha.isBlank()) ? LocalDate.parse(fecha) : LocalDate.now();
        return ResponseEntity.ok(cierreSemanaService.getCierreSemana(f).orElse(null));
    }

    @PostMapping("/cerrar-semana")
    public ResponseEntity<?> cerrarSemana(
            @RequestParam Long tenantId,
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) String notas,
            @RequestParam(required = false) String usuario,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo) {
        try {
            LocalDate f = (fecha != null && !fecha.isBlank()) ? LocalDate.parse(fecha) : LocalDate.now();
            CierreSemana cierre = cierreSemanaService.registrarPagoSemana(tenantId, f, archivo, notas, usuario);
            return ResponseEntity.ok(cierre);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al registrar el pago de semana: " + e.getMessage()));
        }
    }

    @PostMapping("/reabrir-semana")
    public ResponseEntity<?> reabrirSemana(@RequestParam Long tenantId, @RequestParam(required = false) String fecha,
                                            @RequestParam(required = false) String usuario) {
        try {
            LocalDate f = (fecha != null && !fecha.isBlank()) ? LocalDate.parse(fecha) : LocalDate.now();
            cierreSemanaService.reabrirSemana(tenantId, f, usuario != null ? usuario : "Admin");
            return ResponseEntity.ok(Map.of("mensaje", "Semana reabierta exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/{id}/ajuste", "/ajuste"})
    public ResponseEntity<?> guardarAjusteRapido(@RequestParam Long tenantId, @PathVariable(required = false) Long id,
                                                  @RequestBody Map<String, Object> payload) {
        try {
            Long idNomina = id != null ? id : (payload.get("id") != null ? Long.valueOf(payload.get("id").toString()) : null);
            if (idNomina == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "ID de nómina requerido"));
            }
            BigDecimal ajuste = payload.get("ajuste") != null ? new BigDecimal(payload.get("ajuste").toString()) : BigDecimal.ZERO;
            String nota = payload.get("nota") != null ? payload.get("nota").toString().trim() : "";
            return ResponseEntity.ok(nominaService.guardarAjusteRapido(tenantId, idNomina, ajuste, nota));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/pagar", "/registrar-pago"})
    public ResponseEntity<?> registrarPago(@RequestParam Long tenantId, @RequestBody NominaPagoRequestDTO request) {
        try {
            Gasto gastoCreado = nominaService.pagarNomina(tenantId, request);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("mensaje", "Pago de nómina registrado exitosamente");
            resp.put("id", gastoCreado.getId());
            resp.put("gasto", gastoCreado);
            resp.put("totalPagado", gastoCreado.getMonto());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Error al registrar el pago"));
        }
    }
}
