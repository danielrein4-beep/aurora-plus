package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import com.auroraplus.modules.comercio.repositories.PedidoWebComercioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Contraparte AUTENTICADA de CatalogoPublicoController: configurar la cuenta de Pago
 * Movil del negocio y gestionar los pedidos web (listar, cambiar estado) requiere ser
 * personal del propio tenant — nunca debe vivir bajo /api/public/**, donde cualquiera
 * en internet podria leer pedidos de clientes o, peor, reescribir a donde llegan los
 * pagos del negocio con solo conocer el tenantId (un entero secuencial adivinable).
 */
@RestController
@RequestMapping("/api/comercio/catalogo")
public class CatalogoGestionController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private PedidoWebComercioRepository pedidoWebRepository;

    public static class PerfilTiendaRequest {
        public String nombreEmpresa;
        public String logoBase64;
        public String telefonoWhatsapp;
        public String emailContacto;
        public String domicilioFiscal;
    }

    @GetMapping("/perfil-tienda")
    public ResponseEntity<?> obtenerPerfilTienda() {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("nombreEmpresa", licencia.getNombreEmpresa());
        resp.put("logoBase64", licencia.getLogoBase64());
        resp.put("telefonoWhatsapp", licencia.getTelefonoContacto() != null ? licencia.getTelefonoContacto() : "");
        resp.put("emailContacto", licencia.getEmailContacto() != null ? licencia.getEmailContacto() : "");
        resp.put("domicilioFiscal", licencia.getDomicilioFiscal() != null ? licencia.getDomicilioFiscal() : "");
        resp.put("moduloPrincipal", licencia.getModuloPrincipal());
        resp.put("rif", licencia.getRif());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/perfil-tienda")
    public ResponseEntity<?> guardarPerfilTienda(@RequestBody PerfilTiendaRequest req) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        if (req.nombreEmpresa != null && !req.nombreEmpresa.isBlank()) {
            licencia.setNombreEmpresa(req.nombreEmpresa.trim());
        }
        if (req.logoBase64 != null) {
            licencia.setLogoBase64(req.logoBase64);
        }
        if (req.telefonoWhatsapp != null) {
            licencia.setTelefonoContacto(req.telefonoWhatsapp.trim());
        }
        if (req.emailContacto != null) {
            licencia.setEmailContacto(req.emailContacto.trim());
        }
        if (req.domicilioFiscal != null) {
            licencia.setDomicilioFiscal(req.domicilioFiscal.trim());
        }
        licenciaTenantRepository.save(licencia);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("nombreEmpresa", licencia.getNombreEmpresa());
        resp.put("logoBase64", licencia.getLogoBase64());
        resp.put("telefonoWhatsapp", licencia.getTelefonoContacto());
        resp.put("emailContacto", licencia.getEmailContacto());
        resp.put("domicilioFiscal", licencia.getDomicilioFiscal());
        return ResponseEntity.ok(resp);
    }

    public static class ConfigPagoMovilRequest {
        public String banco;
        public String telefono;
        public String documento;
        public String titular;
        public Boolean activo;
    }

    @GetMapping("/pago-movil")
    public ResponseEntity<?> obtenerConfigPagoMovil() {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        Map<String, Object> pagoMovil = new LinkedHashMap<>();
        pagoMovil.put("banco", licencia.getPagoMovilBanco() != null ? licencia.getPagoMovilBanco() : "");
        pagoMovil.put("telefono", licencia.getPagoMovilTelefono() != null ? licencia.getPagoMovilTelefono() : "");
        pagoMovil.put("documento", licencia.getPagoMovilDocumento() != null ? licencia.getPagoMovilDocumento() : "");
        pagoMovil.put("titular", licencia.getPagoMovilTitular() != null ? licencia.getPagoMovilTitular() : "");
        pagoMovil.put("activo", licencia.isPagoMovilActivo());
        return ResponseEntity.ok(pagoMovil);
    }

    @PostMapping("/pago-movil")
    public ResponseEntity<?> guardarConfigPagoMovil(@RequestBody ConfigPagoMovilRequest req) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        if (req.banco != null) licencia.setPagoMovilBanco(req.banco.trim());
        if (req.telefono != null) licencia.setPagoMovilTelefono(req.telefono.trim());
        if (req.documento != null) licencia.setPagoMovilDocumento(req.documento.trim());
        if (req.titular != null) licencia.setPagoMovilTitular(req.titular.trim());
        if (req.activo != null) licencia.setPagoMovilActivo(req.activo);
        licenciaTenantRepository.save(licencia);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("banco", licencia.getPagoMovilBanco());
        resp.put("telefono", licencia.getPagoMovilTelefono());
        resp.put("documento", licencia.getPagoMovilDocumento());
        resp.put("titular", licencia.getPagoMovilTitular());
        resp.put("activo", licencia.isPagoMovilActivo());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/pedidos")
    public ResponseEntity<List<PedidoWebComercio>> listarPedidos() {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(pedidoWebRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId));
    }

    @PostMapping("/pedidos/{pedidoId:[0-9]+}/estado")
    public ResponseEntity<?> actualizarEstadoPedido(@PathVariable Long pedidoId, @RequestParam String estado) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        PedidoWebComercio p = pedidoWebRepository.findById(pedidoId).orElse(null);
        if (p == null || !p.getTenantId().equals(tenantId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido no encontrado"));
        }
        p.setEstado(estado);
        return ResponseEntity.ok(pedidoWebRepository.save(p));
    }
}
