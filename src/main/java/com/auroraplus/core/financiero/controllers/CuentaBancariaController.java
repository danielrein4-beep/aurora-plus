package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.financiero.entities.CuentaBancaria;
import com.auroraplus.core.financiero.entities.MovimientoCuentaBancaria;
import com.auroraplus.core.financiero.repositories.CuentaBancariaRepository;
import com.auroraplus.core.financiero.repositories.MovimientoCuentaBancariaRepository;
import com.auroraplus.core.financiero.services.CuentaBancariaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/financiero/cuentas-bancarias")
public class CuentaBancariaController {

    @Autowired
    private CuentaBancariaService cuentaBancariaService;

    @Autowired
    private CuentaBancariaRepository cuentaBancariaRepository;

    @Autowired
    private MovimientoCuentaBancariaRepository movimientoRepository;

    @GetMapping
    public List<CuentaBancaria> listar(@RequestParam Long tenantId) {
        return cuentaBancariaService.listarConSincronizacion(tenantId);
    }

    public static class CrearCuentaRequest {
        public String nombre;
        public CuentaBancaria.Tipo tipo;
        public String moneda;
        public BigDecimal saldoInicial;
    }

    @PostMapping
    public ResponseEntity<CuentaBancaria> crear(@RequestParam Long tenantId, @RequestBody CrearCuentaRequest req) {
        CuentaBancaria creada = cuentaBancariaService.crear(tenantId, req.nombre, req.tipo, req.moneda, req.saldoInicial);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    public static class ActualizarCuentaRequest {
        public String nombre;
        public CuentaBancaria.Tipo tipo;
        public Boolean activa;
    }

    @PutMapping("/{id}")
    public ResponseEntity<CuentaBancaria> actualizar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody ActualizarCuentaRequest req) {
        return ResponseEntity.ok(cuentaBancariaService.actualizar(tenantId, id, req.nombre, req.tipo, req.activa));
    }

    public static class MontoConceptoRequest {
        public BigDecimal monto;
        public String concepto;
    }

    @PostMapping("/{id}/ingresar")
    public ResponseEntity<CuentaBancaria> ingresar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody MontoConceptoRequest req) {
        return ResponseEntity.ok(cuentaBancariaService.ingresar(tenantId, id, req.monto, req.concepto));
    }

    @PostMapping("/{id}/retirar")
    public ResponseEntity<CuentaBancaria> retirar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody MontoConceptoRequest req) {
        return ResponseEntity.ok(cuentaBancariaService.retirar(tenantId, id, req.monto, req.concepto));
    }

    public static class TransferirRequest {
        public Long origenId;
        public Long destinoId;
        public BigDecimal monto;
    }

    @PostMapping("/transferir")
    public ResponseEntity<Void> transferir(@RequestParam Long tenantId, @RequestBody TransferirRequest req) {
        cuentaBancariaService.transferir(tenantId, req.origenId, req.destinoId, req.monto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/movimientos")
    public List<MovimientoCuentaBancaria> movimientos(@PathVariable Long id, @RequestParam Long tenantId) {
        return movimientoRepository.findByTenantIdAndCuentaIdOrderByFechaRegistroDesc(tenantId, id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        cuentaBancariaService.eliminar(tenantId, id);
        return ResponseEntity.ok().build();
    }
}
