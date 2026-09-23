package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import com.auroraplus.modules.comercio.repositories.PedidoWebComercioRepository;
import com.auroraplus.modules.comercio.services.ConfirmacionPedidoWebService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Contraparte AUTENTICADA de CatalogoPublicoController: configurar la cuenta de Pago
 * Movil del negocio, personalizar logo/slug y gestionar los pedidos web.
 * Permite acceso a administradores, duenos y titulares de la empresa.
 */
@RestController
@RequestMapping("/api/comercio/catalogo")
public class CatalogoGestionController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private PedidoWebComercioRepository pedidoWebRepository;

    @Autowired
    private ConfirmacionPedidoWebService confirmacionPedidoWebService;

    public static class PerfilTiendaRequest {
        public String nombreEmpresa;
        public String logoBase64;
        public String colorAcentoTienda;
        public String bannerBase64;
        public String estiloBannerTienda;
        public String telefonoWhatsapp;
        public String emailContacto;
        public String domicilioFiscal;
        public String slugCatalogo;
        public java.math.BigDecimal costoEnvioDelivery;
    }

    @GetMapping("/perfil-tienda")
    public ResponseEntity<?> obtenerPerfilTienda() {
        // "MEDICO" y "ADMINISTRADOR" quedaron acá por error (copy-paste): MEDICO
        // es un rol exclusivo del módulo clínico sin motivo para tocar la
        // configuración de Comercio, y "ADMINISTRADOR" no existe como rol válido
        // en ningún otro controller (ver Usuario.Rol) — en un tenant con ambos
        // módulos activos, un usuario MEDICO podía entrar a configurar la cuenta
        // de Pago Móvil y ver/gestionar los pedidos web del negocio.
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("nombreEmpresa", licencia.getNombreEmpresa());
        resp.put("slugCatalogo", licencia.getSlugCatalogo() != null ? licencia.getSlugCatalogo() : "tienda-" + tenantId);
        resp.put("logoBase64", licencia.getLogoBase64());
        resp.put("personalizacionTiendaActiva", licencia.isPersonalizacionTiendaActiva());
        resp.put("colorAcentoTienda", licencia.getColorAcentoTienda());
        resp.put("bannerBase64", licencia.getBannerBase64());
        resp.put("estiloBannerTienda", licencia.getEstiloBannerTienda());
        resp.put("telefonoWhatsapp", licencia.getTelefonoContacto() != null ? licencia.getTelefonoContacto() : "");
        resp.put("emailContacto", licencia.getEmailContacto() != null ? licencia.getEmailContacto() : "");
        resp.put("domicilioFiscal", licencia.getDomicilioFiscal() != null ? licencia.getDomicilioFiscal() : "");
        resp.put("moduloPrincipal", licencia.getModuloPrincipal());
        resp.put("rif", licencia.getRif());
        resp.put("costoEnvioDelivery", licencia.getCostoEnvioDelivery());
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
            licencia.setLogoBase64(req.logoBase64.trim().isBlank() ? null : req.logoBase64.trim());
        }
        // El cliente nunca decide si tiene el add-on: el flag de licencia es la
        // única autoridad. Campos inválidos se ignoran para no bloquear el
        // resto del perfil que el dueño sí puede actualizar.
        if (licencia.isPersonalizacionTiendaActiva()) {
            if (req.colorAcentoTienda != null) {
                String color = req.colorAcentoTienda.trim();
                if (color.isBlank()) {
                    licencia.setColorAcentoTienda(null);
                } else if (color.matches("^#[0-9a-fA-F]{6}$")) {
                    licencia.setColorAcentoTienda(color);
                }
            }
            if (req.bannerBase64 != null) {
                licencia.setBannerBase64(req.bannerBase64.trim().isBlank() ? null : req.bannerBase64.trim());
            }
            if (req.estiloBannerTienda != null && ("COMPACTO".equals(req.estiloBannerTienda) || "VITRINA".equals(req.estiloBannerTienda))) {
                licencia.setEstiloBannerTienda(req.estiloBannerTienda);
            }
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
        if (req.costoEnvioDelivery != null && req.costoEnvioDelivery.compareTo(java.math.BigDecimal.ZERO) >= 0) {
            licencia.setCostoEnvioDelivery(req.costoEnvioDelivery);
        }
        if (req.slugCatalogo != null && !req.slugCatalogo.isBlank()) {
            String nuevoSlug = req.slugCatalogo.trim().toLowerCase()
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("^-+|-+$", "");
            if (!nuevoSlug.isBlank()) {
                Optional<LicenciaTenant> existente = licenciaTenantRepository.findBySlugCatalogo(nuevoSlug);
                if (existente.isPresent() && !existente.get().getTenantId().equals(tenantId)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "El enlace personalizado '" + nuevoSlug + "' ya esta en uso por otro comercio."));
                }
                licencia.setSlugCatalogo(nuevoSlug);
            }
        } else if (licencia.getSlugCatalogo() == null || licencia.getSlugCatalogo().isBlank()) {
            String autoSlug = licencia.getNombreEmpresa().trim().toLowerCase()
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("^-+|-+$", "");
            if (autoSlug.isBlank()) autoSlug = "tienda-" + tenantId;
            licencia.setSlugCatalogo(autoSlug);
        }

        try {
            licenciaTenantRepository.save(licencia);
        } catch (DataIntegrityViolationException e) {
            // El chequeo de unicidad de arriba (findBySlugCatalogo) no es atomico con
            // este save — dos tenants pidiendo el mismo slug casi al mismo tiempo
            // pueden pasar ambos ese chequeo antes de que ninguno haya guardado. El
            // indice unico de la BD (V52) sigue siendo la garantia real; esto solo
            // convierte esa colision, antes un 500 sin explicar, en el mismo
            // mensaje amigable que ya se le muestra al usuario en el caso normal.
            return ResponseEntity.badRequest().body(Map.of("error", "El enlace personalizado ya esta en uso por otro comercio — proba con otro."));
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("nombreEmpresa", licencia.getNombreEmpresa());
        resp.put("slugCatalogo", licencia.getSlugCatalogo());
        resp.put("logoBase64", licencia.getLogoBase64());
        resp.put("personalizacionTiendaActiva", licencia.isPersonalizacionTiendaActiva());
        resp.put("colorAcentoTienda", licencia.getColorAcentoTienda());
        resp.put("bannerBase64", licencia.getBannerBase64());
        resp.put("estiloBannerTienda", licencia.getEstiloBannerTienda());
        resp.put("telefonoWhatsapp", licencia.getTelefonoContacto());
        resp.put("emailContacto", licencia.getEmailContacto());
        resp.put("domicilioFiscal", licencia.getDomicilioFiscal());
        resp.put("costoEnvioDelivery", licencia.getCostoEnvioDelivery());
        return ResponseEntity.ok(resp);
    }

    public static class ConfigPagoMovilRequest {
        public String banco;
        public String telefono;
        public String documento;
        public String titular;
        public Boolean activo;
        public Boolean zelleActivo;
        public String zelleCorreo;
        public String zelleTitular;
        public Boolean binanceManualActivo;
        public String binancePayId;
        public Boolean bancolombiaActivo;
        public String bancolombiaCuenta;
        public String bancolombiaTipoCuenta;
        public String bancolombiaTitular;
        public String bancolombiaDocumento;
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
        pagoMovil.put("zelleActivo", licencia.isZelleActivo());
        pagoMovil.put("zelleCorreo", licencia.getZelleCorreo() != null ? licencia.getZelleCorreo() : "");
        pagoMovil.put("zelleTitular", licencia.getZelleTitular() != null ? licencia.getZelleTitular() : "");
        pagoMovil.put("binanceManualActivo", licencia.isBinanceManualActivo());
        pagoMovil.put("binancePayId", licencia.getBinancePayId() != null ? licencia.getBinancePayId() : "");
        pagoMovil.put("bancolombiaActivo", licencia.isBancolombiaActivo());
        pagoMovil.put("bancolombiaCuenta", licencia.getBancolombiaCuenta() != null ? licencia.getBancolombiaCuenta() : "");
        pagoMovil.put("bancolombiaTipoCuenta", licencia.getBancolombiaTipoCuenta() != null ? licencia.getBancolombiaTipoCuenta() : "");
        pagoMovil.put("bancolombiaTitular", licencia.getBancolombiaTitular() != null ? licencia.getBancolombiaTitular() : "");
        pagoMovil.put("bancolombiaDocumento", licencia.getBancolombiaDocumento() != null ? licencia.getBancolombiaDocumento() : "");
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
        if (req.zelleActivo != null) licencia.setZelleActivo(req.zelleActivo);
        if (req.zelleCorreo != null) licencia.setZelleCorreo(req.zelleCorreo.trim());
        if (req.zelleTitular != null) licencia.setZelleTitular(req.zelleTitular.trim());
        if (req.binanceManualActivo != null) licencia.setBinanceManualActivo(req.binanceManualActivo);
        if (req.binancePayId != null) licencia.setBinancePayId(req.binancePayId.trim());
        if (req.bancolombiaActivo != null) licencia.setBancolombiaActivo(req.bancolombiaActivo);
        if (req.bancolombiaCuenta != null) licencia.setBancolombiaCuenta(req.bancolombiaCuenta.trim());
        if (req.bancolombiaTipoCuenta != null) licencia.setBancolombiaTipoCuenta(req.bancolombiaTipoCuenta.trim());
        if (req.bancolombiaTitular != null) licencia.setBancolombiaTitular(req.bancolombiaTitular.trim());
        if (req.bancolombiaDocumento != null) licencia.setBancolombiaDocumento(req.bancolombiaDocumento.trim());
        licenciaTenantRepository.save(licencia);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("banco", licencia.getPagoMovilBanco());
        resp.put("telefono", licencia.getPagoMovilTelefono());
        resp.put("documento", licencia.getPagoMovilDocumento());
        resp.put("titular", licencia.getPagoMovilTitular());
        resp.put("activo", licencia.isPagoMovilActivo());
        resp.put("zelleActivo", licencia.isZelleActivo());
        resp.put("zelleCorreo", licencia.getZelleCorreo());
        resp.put("zelleTitular", licencia.getZelleTitular());
        resp.put("binanceManualActivo", licencia.isBinanceManualActivo());
        resp.put("binancePayId", licencia.getBinancePayId());
        resp.put("bancolombiaActivo", licencia.isBancolombiaActivo());
        resp.put("bancolombiaCuenta", licencia.getBancolombiaCuenta());
        resp.put("bancolombiaTipoCuenta", licencia.getBancolombiaTipoCuenta());
        resp.put("bancolombiaTitular", licencia.getBancolombiaTitular());
        resp.put("bancolombiaDocumento", licencia.getBancolombiaDocumento());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/pedidos")
    public ResponseEntity<List<PedidoWebComercio>> listarPedidos() {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(pedidoWebRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId));
    }

    /**
     * Cambia el estado del pedido SIN efectos contables (rechazar, reabrir, marcar en
     * preparación/despachado) — "COMPLETADO" queda excluido a propósito: ese estado solo
     * se alcanza pasando por /confirmar, que sí descuenta inventario y registra el ingreso
     * real. Permitirlo acá dejaría un pedido "completado" fantasma, sin ningún rastro
     * contable, que fue exactamente el bug que esto reemplaza.
     */
    @PostMapping("/pedidos/{pedidoId:[0-9]+}/estado")
    public ResponseEntity<?> actualizarEstadoPedido(@PathVariable Long pedidoId, @RequestParam String estado) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if ("COMPLETADO".equalsIgnoreCase(estado)) {
            return ResponseEntity.badRequest().body(Map.of("error",
                "Para completar un pedido usa /pedidos/{id}/confirmar — así se descuenta el inventario y se registra la venta real."));
        }
        Long tenantId = TenantContext.getCurrentTenant();
        PedidoWebComercio p = pedidoWebRepository.findById(pedidoId).orElse(null);
        if (p == null || !p.getTenantId().equals(tenantId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido no encontrado"));
        }
        p.setEstado(estado);
        return ResponseEntity.ok(pedidoWebRepository.save(p));
    }

    /** Confirma el pedido: descuenta inventario real, registra el ingreso en caja y calcula utilidad — ver ConfirmacionPedidoWebService. */
    @PostMapping("/pedidos/{pedidoId:[0-9]+}/confirmar")
    public ResponseEntity<?> confirmarPedido(@PathVariable Long pedidoId) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        try {
            return ResponseEntity.ok(confirmacionPedidoWebService.confirmar(tenantId, pedidoId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
