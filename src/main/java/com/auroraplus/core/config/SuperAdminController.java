package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import com.auroraplus.core.auth.services.JwtService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.entities.PagoSuscripcionTenant;
import com.auroraplus.core.config.entities.SaasGastoFijo;
import com.auroraplus.core.config.entities.SaasMovimientoFinanciero;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.config.repositories.PagoSuscripcionTenantRepository;
import com.auroraplus.core.config.repositories.SaasGastoFijoRepository;
import com.auroraplus.core.config.repositories.SaasMovimientoFinancieroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Centro de Control Maestro (SuperAdmin) de Aurora Plus:
 * Administra el ciclo de vida de los tenants, licencias, módulos por vertical,
 * suspensión automática y cobros/pagos de suscripción en el ecosistema.
 */
@RestController
@RequestMapping("/api/super-admin/tenants")
public class SuperAdminController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @Autowired
    private PagoSuscripcionTenantRepository pagoSuscripcionRepository;

    @Autowired
    private SaasGastoFijoRepository saasGastoFijoRepository;

    @Autowired
    private SaasMovimientoFinancieroRepository saasMovimientoRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TenantProvisioningService tenantProvisioningService;

    @Autowired
    private LicenciaSuspensionScheduler suspensionScheduler;

    @Autowired
    private com.auroraplus.core.auth.repositories.UsuarioRepository usuarioRepository;

    @Autowired(required = false)
    private com.auroraplus.core.auditoria.services.RegistroAuditoriaService registroAuditoriaService;

    @Autowired(required = false)
    private com.auroraplus.core.auditoria.repositories.RegistroAuditoriaRepository registroAuditoriaRepository;

    @GetMapping
    public List<LicenciaTenant> listar() {
        List<LicenciaTenant> lista = licenciaTenantRepository.findAll();
        for (LicenciaTenant lic : lista) {
            lic.setCantidadUsuarios(usuarioRepository.countByTenantId(lic.getTenantId()));
        }
        return lista;
    }

    @GetMapping("/{tenantId:[0-9]+}")
    public LicenciaTenant obtener(@PathVariable Long tenantId) {
        LicenciaTenant lic = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        lic.setCantidadUsuarios(usuarioRepository.countByTenantId(tenantId));
        return lic;
    }

    // ══════════════════════════════════════════════════════════════════
    // DASHBOARD & METRICAS EJECUTIVAS
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> obtenerStats() {
        List<LicenciaTenant> todos = licenciaTenantRepository.findAll();
        LocalDate hoy = LocalDate.now();
        LocalDate limite7Dias = hoy.plusDays(7);

        long totalTenants = todos.size();
        long activos = todos.stream().filter(LicenciaTenant::isActiva).count();
        long suspendidos = todos.stream().filter(t -> !t.isActiva()).count();
        long porVencer7Dias = todos.stream()
            .filter(t -> t.isActiva() && t.getFechaVencimientoPago() != null)
            .filter(t -> !t.getFechaVencimientoPago().isBefore(hoy) && !t.getFechaVencimientoPago().isAfter(limite7Dias))
            .count();
        long vencidos = todos.stream()
            .filter(t -> t.getFechaVencimientoPago() != null && t.getFechaVencimientoPago().isBefore(hoy))
            .count();

        // Ingresos cobrados en el mes en curso
        LocalDateTime inicioMes = LocalDate.now().with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
        BigDecimal ingresosMes = pagoSuscripcionRepository.sumarIngresosDesde(inicioMes);

        // Desglose de tenants activos por módulo vertical
        List<ModuloTenant> modulosActivos = moduloTenantRepository.findAll().stream()
            .filter(ModuloTenant::isActivo)
            .toList();

        Map<String, Long> tenantsPorModulo = new LinkedHashMap<>();
        for (ModuloTenant m : modulosActivos) {
            String mod = m.getModuloNombre();
            tenantsPorModulo.put(mod, tenantsPorModulo.getOrDefault(mod, 0L) + 1);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalTenants", totalTenants);
        response.put("activos", activos);
        response.put("suspendidos", suspendidos);
        response.put("porVencer7Dias", porVencer7Dias);
        response.put("vencidos", vencidos);
        response.put("ingresosMes", ingresosMes != null ? ingresosMes : BigDecimal.ZERO);
        response.put("totalUsuarios", usuarioRepository.count());
        response.put("tenantsPorModulo", tenantsPorModulo);

        return ResponseEntity.ok(response);
    }

    // ══════════════════════════════════════════════════════════════════
    // SUSPENSION AUTOMATICA / MANUAL
    // ══════════════════════════════════════════════════════════════════

    @PostMapping("/barrido-suspension")
    public ResponseEntity<Map<String, Object>> ejecutarBarridoSuspension() {
        int suspendidos = suspensionScheduler.suspenderLicenciasVencidas();
        return ResponseEntity.ok(Map.of(
            "suspendidos", suspendidos,
            "mensaje", "Barrido de licencias vencidas completado. Total suspendidos: " + suspendidos
        ));
    }

    // ══════════════════════════════════════════════════════════════════
    // GESTION DE PAGOS Y SUSCRIPCIONES
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/pagos")
    public List<PagoSuscripcionTenant> listarPagos(@RequestParam(required = false) Long tenantId) {
        if (tenantId != null) {
            return pagoSuscripcionRepository.findByTenantIdOrderByFechaPagoDesc(tenantId);
        }
        return pagoSuscripcionRepository.findAllByOrderByFechaPagoDesc();
    }

    public static class RegistrarPagoRequest {
        public Long tenantId;
        public BigDecimal monto;
        public String moneda; // USD, USDT, VES, COP
        public String metodoPago; // BINANCE_USDT, EFECTIVO_USD, TRANSFERENCIA_VES, PAGO_MOVIL, ZELLE, CORTESIA
        public String referenciaComprobante;
        public Integer meses; // 1, 3, 6, 12...
        public Integer dias; // libre
        public String notas;
    }

    /**
     * Registra un pago de suscripción y acredita automáticamente el tiempo
     * correspondiente a la licencia del tenant (desde su fecha de vencimiento
     * si aún no vence, o desde hoy si ya estaba vencido/suspendido).
     */
    @PostMapping("/pagos")
    public ResponseEntity<PagoSuscripcionTenant> registrarPago(@RequestBody RegistrarPagoRequest req) {
        if (req.tenantId == null) throw new RuntimeException("tenantId es obligatorio");
        if (req.monto == null || req.monto.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El monto no puede ser negativo");
        }

        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(req.tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + req.tenantId));

        int meses = req.meses != null && req.meses > 0 ? req.meses : 0;
        int dias = req.dias != null && req.dias > 0 ? req.dias : 0;
        if (meses == 0 && dias == 0) meses = 1; // Default 1 mes

        LocalDate base = (licencia.getFechaVencimientoPago() != null && licencia.getFechaVencimientoPago().isAfter(LocalDate.now()))
            ? licencia.getFechaVencimientoPago()
            : LocalDate.now();

        LocalDate nuevaFecha = meses > 0 ? base.plusMonths(meses) : base;
        if (dias > 0) nuevaFecha = nuevaFecha.plusDays(dias);

        int totalDiasAcreditados = (meses * 30) + dias;

        licencia.setFechaVencimientoPago(nuevaFecha);
        licencia.setActiva(true);
        licenciaTenantRepository.save(licencia);

        PagoSuscripcionTenant pago = new PagoSuscripcionTenant();
        pago.setTenantId(licencia.getTenantId());
        pago.setNombreEmpresa(licencia.getNombreEmpresa());
        pago.setMonto(req.monto);
        pago.setMoneda(req.moneda != null ? req.moneda : "USD");
        pago.setMetodoPago(req.metodoPago != null ? req.metodoPago : "BINANCE_USDT");
        pago.setReferenciaComprobante(req.referenciaComprobante);
        pago.setMesesPagados(meses);
        pago.setDiasAcreditados(totalDiasAcreditados);
        pago.setFechaPago(LocalDateTime.now());
        pago.setFechaRegistro(LocalDateTime.now());
        pago.setEstado("CONFIRMADO");
        pago.setNotas(req.notas);
        pago.setRegistradoPor("superadmin");

        return ResponseEntity.ok(pagoSuscripcionRepository.save(pago));
    }

    public static class RegalarTiempoRequest {
        public Integer dias;
        public Integer meses;
        public String motivo;
    }

    /**
     * Regala días o meses de cortesía a un tenant específico sin registrar cobro financiero.
     */
    @PostMapping("/{tenantId}/regalar-tiempo")
    public ResponseEntity<LicenciaTenant> regalarTiempo(@PathVariable Long tenantId, @RequestBody RegalarTiempoRequest req) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));

        int meses = req.meses != null && req.meses > 0 ? req.meses : 0;
        int dias = req.dias != null && req.dias > 0 ? req.dias : 0;
        if (meses == 0 && dias == 0) dias = 15; // Default regalo 15 días

        LocalDate base = (licencia.getFechaVencimientoPago() != null && licencia.getFechaVencimientoPago().isAfter(LocalDate.now()))
            ? licencia.getFechaVencimientoPago()
            : LocalDate.now();

        LocalDate nuevaFecha = meses > 0 ? base.plusMonths(meses) : base;
        if (dias > 0) nuevaFecha = nuevaFecha.plusDays(dias);

        int totalDias = (meses * 30) + dias;

        licencia.setFechaVencimientoPago(nuevaFecha);
        licencia.setActiva(true);
        LicenciaTenant guardada = licenciaTenantRepository.save(licencia);

        // Registro auditable en pagos con monto cero
        PagoSuscripcionTenant cortesía = new PagoSuscripcionTenant();
        cortesía.setTenantId(licencia.getTenantId());
        cortesía.setNombreEmpresa(licencia.getNombreEmpresa());
        cortesía.setMonto(BigDecimal.ZERO);
        cortesía.setMoneda("USD");
        cortesía.setMetodoPago("CORTESIA");
        cortesía.setReferenciaComprobante("REGALO-SUPERADMIN");
        cortesía.setMesesPagados(meses);
        cortesía.setDiasAcreditados(totalDias);
        cortesía.setFechaPago(LocalDateTime.now());
        cortesía.setFechaRegistro(LocalDateTime.now());
        cortesía.setEstado("CONFIRMADO");
        cortesía.setNotas(req.motivo != null ? req.motivo : "Días de cortesía otorgados por SuperAdmin");
        cortesía.setRegistradoPor("superadmin");
        pagoSuscripcionRepository.save(cortesía);

        return ResponseEntity.ok(guardada);
    }

    /**
     * Genera un token JWT de soporte para acceder como el tenant en un clic (Impersonate).
     */
    @PostMapping("/{tenantId:[0-9]+}/impersonate")
    public ResponseEntity<Map<String, String>> impersonarTenant(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));

        String token = jwtService.generarTokenTenant(tenantId, "soporte-superadmin", "DUENO_ADMIN", 0);

        if (registroAuditoriaService != null) {
            registroAuditoriaService.registrar(
                tenantId,
                "super-admin",
                "IMPERSONATE",
                "LicenciaTenant",
                tenantId,
                "Inicio de sesion de soporte tecnico (Impersonacion) por SuperAdmin para " + licencia.getNombreEmpresa()
            );
        }

        return ResponseEntity.ok(Map.of(
            "token", token,
            "tenantId", String.valueOf(tenantId),
            "nombreEmpresa", licencia.getNombreEmpresa(),
            "moduloPrincipal", licencia.getModuloPrincipal()
        ));
    }

    // ══════════════════════════════════════════════════════════════════
    // CRUD Y CONFIGURACION DE TENANTS
    // ══════════════════════════════════════════════════════════════════

    public static class CrearTenantRequest {
        public String nombreEmpresa;
        public String moduloPrincipal; // horeca, repuestos, ferreteria, comercio, tamanaco-comercial, ganaderia, salud...
        public LicenciaTenant.TipoLicencia tipoLicencia;
        public String emailContacto;
        public String telefonoContacto;
        public Integer mesesVigencia; // opcional, por defecto 1 mes
        public String monedaBase; // opcional, por defecto USD
        public String usuarioInicial;
        public String passwordInicial;
        public Boolean accesoTotal;
        public Integer limiteUsuarios;
    }

    @PostMapping
    public ResponseEntity<LicenciaTenant> crear(@RequestBody CrearTenantRequest request) {
        TenantProvisioningService.AltaTenantRequest alta = new TenantProvisioningService.AltaTenantRequest();
        alta.nombreEmpresa = request.nombreEmpresa;
        alta.moduloPrincipal = request.moduloPrincipal;
        alta.tipoLicencia = request.tipoLicencia;
        alta.emailContacto = request.emailContacto;
        alta.telefonoContacto = request.telefonoContacto;
        alta.mesesVigencia = request.mesesVigencia;
        alta.monedaBase = request.monedaBase;
        alta.usuarioInicial = request.usuarioInicial;
        alta.passwordInicial = request.passwordInicial;
        alta.accesoTotal = request.accesoTotal;
        alta.limiteUsuarios = request.limiteUsuarios;
        return ResponseEntity.ok(tenantProvisioningService.crear(alta));
    }

    public static class ActualizarTenantRequest {
        public String nombreEmpresa;
        public String moduloPrincipal;
        public String emailContacto;
        public String telefonoContacto;
        public String monedaBase;
    }

    @PutMapping("/{tenantId:[0-9]+}")
    public ResponseEntity<LicenciaTenant> actualizar(@PathVariable Long tenantId, @RequestBody ActualizarTenantRequest request) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));

        if (request.nombreEmpresa != null) licencia.setNombreEmpresa(request.nombreEmpresa);
        if (request.moduloPrincipal != null) licencia.setModuloPrincipal(request.moduloPrincipal);
        if (request.emailContacto != null) licencia.setEmailContacto(request.emailContacto);
        if (request.telefonoContacto != null) licencia.setTelefonoContacto(request.telefonoContacto);
        if (request.monedaBase != null) licencia.setMonedaBase(request.monedaBase);

        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
    }

    @PostMapping("/{tenantId}/activar")
    public ResponseEntity<LicenciaTenant> activar(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setActiva(true);
        LicenciaTenant res = licenciaTenantRepository.save(licencia);
        if (registroAuditoriaService != null) {
            registroAuditoriaService.registrar(
                tenantId,
                "SUPER_ADMIN",
                "ACTIVAR",
                "LicenciaTenant",
                tenantId,
                "Reactivacion administrativa del negocio: " + licencia.getNombreEmpresa()
            );
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{tenantId}/desactivar")
    public ResponseEntity<LicenciaTenant> desactivar(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setActiva(false);
        LicenciaTenant res = licenciaTenantRepository.save(licencia);
        if (registroAuditoriaService != null) {
            registroAuditoriaService.registrar(
                tenantId,
                "SUPER_ADMIN",
                "SUSPENDER",
                "LicenciaTenant",
                tenantId,
                "Suspension administrativa del negocio: " + licencia.getNombreEmpresa()
            );
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{tenantId}/renovar")
    public ResponseEntity<LicenciaTenant> renovar(@PathVariable Long tenantId, @RequestParam(defaultValue = "1") int meses) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        LocalDate base = (licencia.getFechaVencimientoPago() != null && licencia.getFechaVencimientoPago().isAfter(LocalDate.now()))
            ? licencia.getFechaVencimientoPago()
            : LocalDate.now();
        licencia.setFechaVencimientoPago(base.plusMonths(meses));
        licencia.setActiva(true);
        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
    }

    @PostMapping("/{tenantId}/cambiar-plan")
    public ResponseEntity<LicenciaTenant> cambiarPlan(@PathVariable Long tenantId, @RequestParam LicenciaTenant.TipoLicencia tipoLicencia) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setTipoLicencia(tipoLicencia);
        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
    }

    // ══════════════════════════════════════════════════════════════════
    // GESTION DE MODULOS POR TENANT
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/{tenantId}/modulos")
    public List<ModuloTenant> listarModulos(@PathVariable Long tenantId) {
        return moduloTenantRepository.findByTenantId(tenantId);
    }

    public static class ModuloRequest {
        public String moduloNombre;
        public boolean activo;
    }

    @PostMapping("/{tenantId:[0-9]+}/acceso-total")
    public ResponseEntity<LicenciaTenant> concederAccesoTotal(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));

        if (licencia.getTipoLicencia().ordinal() < LicenciaTenant.TipoLicencia.INDUSTRIAL.ordinal()) {
            licencia.setTipoLicencia(LicenciaTenant.TipoLicencia.INDUSTRIAL);
        }
        licencia.setActiva(true);
        // Sin esto, un tenant con fechaVencimientoPago ya vencida (ej. una prueba
        // caducada) se reactivaba acá pero el barrido automático de medianoche
        // (LicenciaSuspensionScheduler) lo volvía a suspender esa misma noche,
        // deshaciendo el Acceso Total sin ningún aviso.
        licencia.setFechaVencimientoPago(LocalDate.now().plusYears(100));
        LicenciaTenant guardada = licenciaTenantRepository.save(licencia);

        for (String mod : TenantProvisioningService.TODOS_LOS_MODULOS) {
            ModuloTenant mt = moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, mod)
                .orElseGet(() -> {
                    ModuloTenant nuevo = new ModuloTenant();
                    nuevo.setTenantId(tenantId);
                    nuevo.setModuloNombre(mod);
                    return nuevo;
                });
            mt.setActivo(true);
            moduloTenantRepository.save(mt);
        }

        return ResponseEntity.ok(guardada);
    }

    @PostMapping("/{tenantId}/modulos")
    public ResponseEntity<ModuloTenant> activarModulo(@PathVariable Long tenantId, @RequestBody ModuloRequest request) {
        if (request.moduloNombre == null || request.moduloNombre.isBlank()) {
            throw new RuntimeException("moduloNombre es obligatorio");
        }
        licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));

        ModuloTenant modulo = moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, request.moduloNombre)
            .orElseGet(() -> {
                ModuloTenant nuevo = new ModuloTenant();
                nuevo.setTenantId(tenantId);
                nuevo.setModuloNombre(request.moduloNombre);
                return nuevo;
            });
        modulo.setActivo(request.activo);
        return ResponseEntity.ok(moduloTenantRepository.save(modulo));
    }

    public static class PersonalizacionTiendaRequest {
        public boolean activo;
    }

    @PostMapping("/{tenantId:[0-9]+}/personalizacion-tienda")
    public ResponseEntity<LicenciaTenant> actualizarPersonalizacionTienda(
            @PathVariable Long tenantId,
            @RequestBody PersonalizacionTiendaRequest request) {
        AuthContext.exigirRol("SUPER_ADMIN");
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setPersonalizacionTiendaActiva(request.activo);
        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
    }

    // ══════════════════════════════════════════════════════════════════
    // USUARIOS DE UN TENANT
    // ══════════════════════════════════════════════════════════════════

    public static class CrearUsuarioTenantRequest {
        public String username;
        public String password;
        public Usuario.Rol rol;
        public String nombreCompleto;
    }

    @PostMapping("/{tenantId}/usuarios")
    public ResponseEntity<Usuario> crearUsuarioTenant(@PathVariable Long tenantId, @RequestBody CrearUsuarioTenantRequest request) {
        licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        Usuario.Rol rol = request.rol != null ? request.rol : Usuario.Rol.DUENO_ADMIN;
        return ResponseEntity.ok(authService.crearUsuario(tenantId, request.username, request.password, rol, request.nombreCompleto));
    }

    // ══════════════════════════════════════════════════════════════════
    // GESTION DE USUARIOS Y LIMITES POR TENANT
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/{tenantId:[0-9]+}/usuarios")
    public List<com.auroraplus.core.auth.entities.Usuario> listarUsuariosTenant(@PathVariable Long tenantId) {
        licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        return usuarioRepository.findByTenantId(tenantId);
    }

    public static class LimiteUsuariosRequest {
        public Integer limiteUsuarios;
    }

    @PostMapping("/{tenantId:[0-9]+}/limite-usuarios")
    public ResponseEntity<LicenciaTenant> asignarLimiteUsuarios(
        @PathVariable Long tenantId,
        @RequestBody LimiteUsuariosRequest req
    ) {
        LicenciaTenant lic = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        Integer nuevoLimite = (req.limiteUsuarios != null && req.limiteUsuarios > 0) ? req.limiteUsuarios : null;
        lic.setLimiteUsuarios(nuevoLimite);
        LicenciaTenant guardada = licenciaTenantRepository.save(lic);
        guardada.setCantidadUsuarios(usuarioRepository.countByTenantId(tenantId));
        return ResponseEntity.ok(guardada);
    }

    @PostMapping("/{tenantId:[0-9]+}/usuarios/{usuarioId:[0-9]+}/toggle-activo")
    public ResponseEntity<com.auroraplus.core.auth.entities.Usuario> toggleUsuarioActivo(
        @PathVariable Long tenantId,
        @PathVariable Long usuarioId
    ) {
        com.auroraplus.core.auth.entities.Usuario u = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + usuarioId));
        if (!u.getTenantId().equals(tenantId)) {
            throw new RuntimeException("El usuario no pertenece al tenant " + tenantId);
        }
        u.setActivo(!u.isActivo());
        return ResponseEntity.ok(usuarioRepository.save(u));
    }


    // ==========================================
    // MODULO FINANCIERO Y CONTABILIDAD SAAS
    // ==========================================

    @GetMapping("/finanzas/resumen")
    public ResponseEntity<Map<String, Object>> obtenerResumenFinanciero(
        @RequestParam(required = false) String mes
    ) {
        LocalDate ahora = LocalDate.now();
        LocalDate desde;
        LocalDate hasta;
        if (mes != null && mes.matches("^\\d{4}-\\d{2}$")) {
            desde = LocalDate.parse(mes + "-01");
            hasta = desde.with(TemporalAdjusters.lastDayOfMonth());
        } else {
            desde = ahora.with(TemporalAdjusters.firstDayOfMonth());
            hasta = ahora.with(TemporalAdjusters.lastDayOfMonth());
        }

        LocalDateTime desdeDt = desde.atStartOfDay();
        LocalDateTime hastaDt = hasta.atTime(23, 59, 59);

        BigDecimal ingresosSuscripciones = pagoSuscripcionRepository.sumarIngresosRango(desdeDt, hastaDt);
        BigDecimal ingresosExtras = saasMovimientoRepository.sumMontoPorTipoYRango("INGRESO", desde, hasta);
        BigDecimal totalIngresos = ingresosSuscripciones.add(ingresosExtras);

        BigDecimal totalEgresos = saasMovimientoRepository.sumMontoPorTipoYRango("EGRESO", desde, hasta);
        BigDecimal gastosFijosComprometidos = saasGastoFijoRepository.sumTotalMensualActivo();

        BigDecimal utilidadNeta = totalIngresos.subtract(totalEgresos);
        double margen = 0.0;
        if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
            margen = utilidadNeta.divide(totalIngresos, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100.0;
        }

        BigDecimal ingresosHistoricos = pagoSuscripcionRepository.sumarIngresosDesde(LocalDateTime.of(2020, 1, 1, 0, 0))
            .add(saasMovimientoRepository.sumMontoHistoricoPorTipo("INGRESO"));
        BigDecimal egresosHistoricos = saasMovimientoRepository.sumMontoHistoricoPorTipo("EGRESO");
        BigDecimal balanceHistorico = ingresosHistoricos.subtract(egresosHistoricos);

        Map<String, Object> map = new HashMap<>();
        map.put("mes", desde.toString().substring(0, 7));
        map.put("ingresosSuscripciones", ingresosSuscripciones);
        map.put("ingresosExtras", ingresosExtras);
        map.put("totalIngresos", totalIngresos);
        map.put("totalEgresos", totalEgresos);
        map.put("gastosFijosMensuales", gastosFijosComprometidos);
        map.put("utilidadNeta", utilidadNeta);
        map.put("margenPorcentaje", Math.round(margen * 100.0) / 100.0);
        map.put("balanceHistorico", balanceHistorico);
        map.put("totalGastosFijosActivos", saasGastoFijoRepository.findByActivoTrue().size());

        return ResponseEntity.ok(map);
    }

    @GetMapping("/finanzas/gastos-fijos")
    public List<SaasGastoFijo> listarGastosFijos() {
        return saasGastoFijoRepository.findByOrderByActivoDescConceptoAsc();
    }

    @PostMapping("/finanzas/gastos-fijos")
    public ResponseEntity<SaasGastoFijo> crearGastoFijo(@RequestBody SaasGastoFijo gasto) {
        if (gasto.getConcepto() == null || gasto.getConcepto().trim().isEmpty()) {
            throw new RuntimeException("El concepto es obligatorio");
        }
        if (gasto.getMontoUsd() == null || gasto.getMontoUsd().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto debe ser mayor a 0");
        }
        if (gasto.getPeriodicidad() == null) gasto.setPeriodicidad("MENSUAL");
        if (gasto.getCategoria() == null) gasto.setCategoria("INFRAESTRUCTURA");
        if (gasto.getActivo() == null) gasto.setActivo(true);
        gasto.setFechaCreacion(LocalDateTime.now());
        return ResponseEntity.ok(saasGastoFijoRepository.save(gasto));
    }

    @PutMapping("/finanzas/gastos-fijos/{id:[0-9]+}")
    public ResponseEntity<SaasGastoFijo> actualizarGastoFijo(@PathVariable Long id, @RequestBody SaasGastoFijo act) {
        SaasGastoFijo g = saasGastoFijoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Gasto fijo no encontrado: " + id));
        if (act.getConcepto() != null) g.setConcepto(act.getConcepto());
        if (act.getCategoria() != null) g.setCategoria(act.getCategoria());
        if (act.getMontoUsd() != null) g.setMontoUsd(act.getMontoUsd());
        if (act.getPeriodicidad() != null) g.setPeriodicidad(act.getPeriodicidad());
        if (act.getDiaPago() != null) g.setDiaPago(act.getDiaPago());
        if (act.getMetodoPago() != null) g.setMetodoPago(act.getMetodoPago());
        if (act.getProveedor() != null) g.setProveedor(act.getProveedor());
        if (act.getActivo() != null) g.setActivo(act.getActivo());
        if (act.getNotas() != null) g.setNotas(act.getNotas());
        return ResponseEntity.ok(saasGastoFijoRepository.save(g));
    }

    @PostMapping("/finanzas/gastos-fijos/{id:[0-9]+}/toggle")
    public ResponseEntity<SaasGastoFijo> toggleGastoFijo(@PathVariable Long id) {
        SaasGastoFijo g = saasGastoFijoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Gasto fijo no encontrado: " + id));
        g.setActivo(!Boolean.TRUE.equals(g.getActivo()));
        return ResponseEntity.ok(saasGastoFijoRepository.save(g));
    }

    @DeleteMapping("/finanzas/gastos-fijos/{id:[0-9]+}")
    public ResponseEntity<Map<String, String>> eliminarGastoFijo(@PathVariable Long id) {
        saasGastoFijoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("mensaje", "Gasto fijo eliminado"));
    }

    @PostMapping("/finanzas/gastos-fijos/{id:[0-9]+}/ejecutar")
    public ResponseEntity<SaasMovimientoFinanciero> ejecutarGastoFijo(
        @PathVariable Long id,
        @RequestParam(required = false) String referencia
    ) {
        SaasGastoFijo gf = saasGastoFijoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Gasto fijo no encontrado: " + id));
        SaasMovimientoFinanciero mov = new SaasMovimientoFinanciero();
        mov.setTipo("EGRESO");
        mov.setCategoria(gf.getCategoria());
        mov.setConcepto("Pago Fijo: " + gf.getConcepto() + (gf.getProveedor() != null ? " (" + gf.getProveedor() + ")" : ""));
        mov.setMontoUsd(gf.getMontoUsd());
        mov.setFechaMovimiento(LocalDate.now());
        mov.setMetodoPago(gf.getMetodoPago() != null ? gf.getMetodoPago() : "TARJETA_CREDITO");
        mov.setReferenciaComprobante(referencia);
        mov.setGastoFijoId(gf.getId());
        mov.setRegistradoPor("superadmin");
        mov.setFechaCreacion(LocalDateTime.now());
        return ResponseEntity.ok(saasMovimientoRepository.save(mov));
    }

    @GetMapping("/finanzas/movimientos")
    public List<SaasMovimientoFinanciero> listarMovimientos(
        @RequestParam(required = false) String mes,
        @RequestParam(required = false) String tipo
    ) {
        LocalDate ahora = LocalDate.now();
        LocalDate desde;
        LocalDate hasta;
        if (mes != null && mes.matches("^\\d{4}-\\d{2}$")) {
            desde = LocalDate.parse(mes + "-01");
            hasta = desde.with(TemporalAdjusters.lastDayOfMonth());
        } else {
            desde = ahora.with(TemporalAdjusters.firstDayOfMonth());
            hasta = ahora.with(TemporalAdjusters.lastDayOfMonth());
        }

        if (tipo != null && !tipo.trim().isEmpty() && !tipo.equalsIgnoreCase("TODOS")) {
            return saasMovimientoRepository.findByTipoAndFechaMovimientoBetweenOrderByFechaMovimientoDescIdDesc(
                tipo.toUpperCase(), desde, hasta
            );
        }
        return saasMovimientoRepository.findByFechaMovimientoBetweenOrderByFechaMovimientoDescIdDesc(desde, hasta);
    }

    @PostMapping("/finanzas/movimientos")
    public ResponseEntity<SaasMovimientoFinanciero> registrarMovimiento(@RequestBody SaasMovimientoFinanciero mov) {
        if (mov.getConcepto() == null || mov.getConcepto().trim().isEmpty()) {
            throw new RuntimeException("El concepto es obligatorio");
        }
        if (mov.getMontoUsd() == null || mov.getMontoUsd().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto debe ser mayor a 0");
        }
        if (mov.getTipo() == null || (!mov.getTipo().equalsIgnoreCase("INGRESO") && !mov.getTipo().equalsIgnoreCase("EGRESO"))) {
            throw new RuntimeException("El tipo debe ser INGRESO o EGRESO");
        }
        mov.setTipo(mov.getTipo().toUpperCase());
        if (mov.getCategoria() == null) mov.setCategoria("OTRO");
        if (mov.getFechaMovimiento() == null) mov.setFechaMovimiento(LocalDate.now());
        if (mov.getMetodoPago() == null) mov.setMetodoPago("TRANSFERENCIA_BANCARIA");
        mov.setRegistradoPor("superadmin");
        mov.setFechaCreacion(LocalDateTime.now());
        return ResponseEntity.ok(saasMovimientoRepository.save(mov));
    }

    @DeleteMapping("/finanzas/movimientos/{id:[0-9]+}")
    public ResponseEntity<Map<String, String>> eliminarMovimiento(@PathVariable Long id) {
        saasMovimientoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("mensaje", "Movimiento eliminado"));
    }

    // =========================================================================
    // MODULO DE METRICAS, ESTADISTICAS Y RANKING DE TENANTS SAAS
    // =========================================================================
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> obtenerAnalytics(
        @RequestParam(required = false, defaultValue = "MES") String periodo,
        @RequestParam(required = false) String fechaRef
    ) {
        String modo = (periodo != null ? periodo.toUpperCase().trim() : "MES");
        LocalDate refDate;
        try {
            if (fechaRef != null && fechaRef.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
                refDate = LocalDate.parse(fechaRef);
            } else {
                refDate = LocalDate.now();
            }
        } catch (Exception e) {
            refDate = LocalDate.now();
        }

        LocalDateTime desde;
        LocalDateTime hasta;
        String periodoLabel;

        switch (modo) {
            case "DIA":
                desde = refDate.atStartOfDay();
                hasta = refDate.atTime(23, 59, 59);
                periodoLabel = "Dia: " + refDate.toString();
                break;
            case "SEMANA":
                desde = refDate.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).atStartOfDay();
                hasta = refDate.with(TemporalAdjusters.nextOrSame(java.time.DayOfWeek.SUNDAY)).atTime(23, 59, 59);
                periodoLabel = "Semana: " + desde.toLocalDate() + " al " + hasta.toLocalDate();
                break;
            case "HISTORICO":
                desde = LocalDateTime.of(2020, 1, 1, 0, 0, 0);
                hasta = LocalDateTime.now().plusDays(1);
                periodoLabel = "Historico Total Acumulado";
                break;
            case "MES":
            default:
                modo = "MES";
                desde = refDate.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
                hasta = refDate.with(TemporalAdjusters.lastDayOfMonth()).atTime(23, 59, 59);
                periodoLabel = "Mes: " + refDate.getMonth().getDisplayName(java.time.format.TextStyle.FULL, new Locale("es", "ES")) + " " + refDate.getYear();
                break;
        }

        List<LicenciaTenant> todosTenants = licenciaTenantRepository.findAll();
        List<PagoSuscripcionTenant> todosPagos = pagoSuscripcionRepository.findAllByOrderByFechaPagoDesc();

        List<PagoSuscripcionTenant> pagosConfirmados = todosPagos.stream()
            .filter(p -> "CONFIRMADO".equalsIgnoreCase(p.getEstado()))
            .collect(Collectors.toList());

        final LocalDateTime fDesde = desde;
        final LocalDateTime fHasta = hasta;
        List<PagoSuscripcionTenant> pagosPeriodo = pagosConfirmados.stream()
            .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(fDesde) && !p.getFechaPago().isAfter(fHasta))
            .collect(Collectors.toList());

        // KPIs
        BigDecimal facturacionPeriodo = pagosPeriodo.stream()
            .map(PagoSuscripcionTenant::getMonto)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long cantidadPagosPeriodo = pagosPeriodo.size();
        BigDecimal ticketPromedioPeriodo = cantidadPagosPeriodo > 0
            ? facturacionPeriodo.divide(BigDecimal.valueOf(cantidadPagosPeriodo), 2, java.math.RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        BigDecimal facturacionHistorica = pagosConfirmados.stream()
            .map(PagoSuscripcionTenant::getMonto)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalTenants = todosTenants.size();
        long tenantsActivos = todosTenants.stream().filter(LicenciaTenant::isActiva).count();
        long tenantsSuspendidos = totalTenants - tenantsActivos;
        double tasaRetencion = totalTenants > 0 ? Math.round(((double) tenantsActivos / totalTenants) * 1000.0) / 10.0 : 100.0;

        long nuevosTenantsPeriodo = todosTenants.stream()
            .filter(t -> t.getFechaAlta() != null && !t.getFechaAlta().isBefore(fDesde.toLocalDate()) && !t.getFechaAlta().isAfter(fHasta.toLocalDate()))
            .count();

        // 1. RANKING TOP TENANTS
        Map<Long, List<PagoSuscripcionTenant>> pagosPorTenant = pagosConfirmados.stream()
            .collect(Collectors.groupingBy(PagoSuscripcionTenant::getTenantId));

        Map<Long, List<PagoSuscripcionTenant>> pagosPeriodoPorTenant = pagosPeriodo.stream()
            .collect(Collectors.groupingBy(PagoSuscripcionTenant::getTenantId));

        List<Map<String, Object>> topTenants = new ArrayList<>();
        for (LicenciaTenant lic : todosTenants) {
            Long tid = lic.getTenantId();
            List<PagoSuscripcionTenant> pgs = pagosPorTenant.getOrDefault(tid, Collections.emptyList());
            List<PagoSuscripcionTenant> pgsPeriodo = pagosPeriodoPorTenant.getOrDefault(tid, Collections.emptyList());

            BigDecimal totalPagado = pgs.stream()
                .map(PagoSuscripcionTenant::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal pagadoPeriodo = pgsPeriodo.stream()
                .map(PagoSuscripcionTenant::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            int mesesAdquiridos = pgs.stream()
                .mapToInt(p -> p.getMesesPagados() != null ? p.getMesesPagados() : 1)
                .sum();

            LocalDateTime ultimoPago = pgs.stream()
                .map(PagoSuscripcionTenant::getFechaPago)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("tenantId", tid);
            fila.put("nombreEmpresa", lic.getNombreEmpresa());
            fila.put("moduloPrincipal", lic.getModuloPrincipal() != null ? lic.getModuloPrincipal() : "general");
            fila.put("tipoLicencia", lic.getTipoLicencia() != null ? lic.getTipoLicencia().name() : "COMERCIAL");
            fila.put("activa", lic.isActiva());
            fila.put("totalFacturadoUsd", totalPagado);
            fila.put("facturadoPeriodoUsd", pagadoPeriodo);
            fila.put("cantidadPagos", pgs.size());
            fila.put("cantidadPagosPeriodo", pgsPeriodo.size());
            fila.put("mesesAdquiridos", mesesAdquiridos);
            fila.put("ultimoPago", ultimoPago != null ? ultimoPago.toString() : null);
            fila.put("fechaVencimientoPago", lic.getFechaVencimientoPago() != null ? lic.getFechaVencimientoPago().toString() : null);
            topTenants.add(fila);
        }

        // Ordenar por totalFacturadoUsd descendente, luego por mesesAdquiridos
        topTenants.sort((a, b) -> {
            BigDecimal mB = (BigDecimal) b.get("totalFacturadoUsd");
            BigDecimal mA = (BigDecimal) a.get("totalFacturadoUsd");
            int c = mB.compareTo(mA);
            if (c != 0) return c;
            Integer mesB = (Integer) b.get("mesesAdquiridos");
            Integer mesA = (Integer) a.get("mesesAdquiridos");
            return mesB.compareTo(mesA);
        });

        for (int i = 0; i < topTenants.size(); i++) {
            topTenants.get(i).put("posicion", i + 1);
        }

        // 2. DESGLOSE POR VERTICAL / INDUSTRIA
        Map<String, List<LicenciaTenant>> tenantsPorModulo = todosTenants.stream()
            .collect(Collectors.groupingBy(t -> t.getModuloPrincipal() != null ? t.getModuloPrincipal().toLowerCase() : "general"));

        List<Map<String, Object>> verticales = new ArrayList<>();
        for (Map.Entry<String, List<LicenciaTenant>> entry : tenantsPorModulo.entrySet()) {
            String mod = entry.getKey();
            List<LicenciaTenant> listaT = entry.getValue();
            Set<Long> tids = listaT.stream().map(LicenciaTenant::getTenantId).collect(Collectors.toSet());

            BigDecimal facturadoVert = pagosConfirmados.stream()
                .filter(p -> tids.contains(p.getTenantId()))
                .map(PagoSuscripcionTenant::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal facturadoVertPeriodo = pagosPeriodo.stream()
                .filter(p -> tids.contains(p.getTenantId()))
                .map(PagoSuscripcionTenant::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            String nombreLimpio;
            switch (mod) {
                case "salud": nombreLimpio = "Salud y MediClinic"; break;
                case "horeca": nombreLimpio = "Gastronomia / HORECA"; break;
                case "ganaderia": nombreLimpio = "Ganaderia y Agro"; break;
                case "repuestos": nombreLimpio = "Repuestos y Talleres"; break;
                case "moda": nombreLimpio = "Moda y Calzado"; break;
                case "minero": nombreLimpio = "Mineria y Canteras"; break;
                case "comercial":
                case "tamanaco-comercial": nombreLimpio = "Comercio General"; break;
                default: nombreLimpio = mod.substring(0, 1).toUpperCase() + mod.substring(1); break;
            }

            double cuotaTenants = totalTenants > 0 ? Math.round(((double) listaT.size() / totalTenants) * 1000.0) / 10.0 : 0.0;
            double cuotaFacturacion = facturacionHistorica.compareTo(BigDecimal.ZERO) > 0
                ? Math.round(facturadoVert.multiply(BigDecimal.valueOf(100)).divide(facturacionHistorica, 1, java.math.RoundingMode.HALF_UP).doubleValue() * 10.0) / 10.0
                : 0.0;

            Map<String, Object> vObj = new LinkedHashMap<>();
            vObj.put("vertical", mod);
            vObj.put("nombreVertical", nombreLimpio);
            vObj.put("totalTenants", listaT.size());
            vObj.put("cuotaTenantsPct", cuotaTenants);
            vObj.put("totalFacturadoUsd", facturadoVert);
            vObj.put("facturadoPeriodoUsd", facturadoVertPeriodo);
            vObj.put("cuotaFacturacionPct", cuotaFacturacion);
            verticales.add(vObj);
        }

        verticales.sort((a, b) -> ((BigDecimal) b.get("totalFacturadoUsd")).compareTo((BigDecimal) a.get("totalFacturadoUsd")));

        // 3. DESGLOSE POR PLAN DE LICENCIA
        Map<String, List<LicenciaTenant>> tenantsPorPlan = todosTenants.stream()
            .collect(Collectors.groupingBy(t -> t.getTipoLicencia() != null ? t.getTipoLicencia().name() : "COMERCIAL"));

        List<Map<String, Object>> planes = new ArrayList<>();
        for (String planName : Arrays.asList("BASICA", "COMERCIAL", "INDUSTRIAL")) {
            List<LicenciaTenant> lPlan = tenantsPorPlan.getOrDefault(planName, Collections.emptyList());
            Set<Long> tids = lPlan.stream().map(LicenciaTenant::getTenantId).collect(Collectors.toSet());
            BigDecimal facturadoPlan = pagosConfirmados.stream()
                .filter(p -> tids.contains(p.getTenantId()))
                .map(PagoSuscripcionTenant::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            double pct = totalTenants > 0 ? Math.round(((double) lPlan.size() / totalTenants) * 1000.0) / 10.0 : 0.0;

            Map<String, Object> pMap = new LinkedHashMap<>();
            pMap.put("plan", planName);
            pMap.put("totalTenants", lPlan.size());
            pMap.put("porcentaje", pct);
            pMap.put("totalFacturadoUsd", facturadoPlan);
            planes.add(pMap);
        }

        // 4. DESGLOSE POR METODO DE PAGO
        Map<String, List<PagoSuscripcionTenant>> pagosPorMetodo = pagosPeriodo.stream()
            .collect(Collectors.groupingBy(p -> p.getMetodoPago() != null ? p.getMetodoPago() : "OTRO"));

        List<Map<String, Object>> metodosPago = new ArrayList<>();
        for (Map.Entry<String, List<PagoSuscripcionTenant>> entry : pagosPorMetodo.entrySet()) {
            BigDecimal sum = entry.getValue().stream()
                .map(PagoSuscripcionTenant::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            double pct = facturacionPeriodo.compareTo(BigDecimal.ZERO) > 0
                ? Math.round(sum.multiply(BigDecimal.valueOf(100)).divide(facturacionPeriodo, 1, java.math.RoundingMode.HALF_UP).doubleValue() * 10.0) / 10.0
                : 0.0;

            Map<String, Object> mObj = new LinkedHashMap<>();
            mObj.put("metodo", entry.getKey());
            mObj.put("cantidadPagos", entry.getValue().size());
            mObj.put("totalUsd", sum);
            mObj.put("porcentaje", pct);
            metodosPago.add(mObj);
        }
        metodosPago.sort((a, b) -> ((BigDecimal) b.get("totalUsd")).compareTo((BigDecimal) a.get("totalUsd")));

        // 5. TENDENCIA TEMPORAL
        List<Map<String, Object>> tendencia = new ArrayList<>();
        if ("DIA".equals(modo)) {
            for (int i = 6; i >= 0; i--) {
                LocalDate d = refDate.minusDays(i);
                LocalDateTime dIni = d.atStartOfDay();
                LocalDateTime dFin = d.atTime(23, 59, 59);
                BigDecimal sumDia = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(dIni) && !p.getFechaPago().isAfter(dFin))
                    .map(PagoSuscripcionTenant::getMonto)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                long cntDia = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(dIni) && !p.getFechaPago().isAfter(dFin))
                    .count();

                Map<String, Object> pto = new LinkedHashMap<>();
                pto.put("etiqueta", d.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, new Locale("es", "ES")) + " " + d.getDayOfMonth());
                pto.put("fecha", d.toString());
                pto.put("montoUsd", sumDia);
                pto.put("cantidad", cntDia);
                tendencia.add(pto);
            }
        } else if ("SEMANA".equals(modo)) {
            LocalDate monday = refDate.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            for (int i = 0; i < 7; i++) {
                LocalDate d = monday.plusDays(i);
                LocalDateTime dIni = d.atStartOfDay();
                LocalDateTime dFin = d.atTime(23, 59, 59);
                BigDecimal sumDia = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(dIni) && !p.getFechaPago().isAfter(dFin))
                    .map(PagoSuscripcionTenant::getMonto)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                long cntDia = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(dIni) && !p.getFechaPago().isAfter(dFin))
                    .count();

                Map<String, Object> pto = new LinkedHashMap<>();
                pto.put("etiqueta", d.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, new Locale("es", "ES")) + " " + d.getDayOfMonth());
                pto.put("fecha", d.toString());
                pto.put("montoUsd", sumDia);
                pto.put("cantidad", cntDia);
                tendencia.add(pto);
            }
        } else if ("MES".equals(modo)) {
            LocalDate primerDia = refDate.with(TemporalAdjusters.firstDayOfMonth());
            LocalDate ultimoDia = refDate.with(TemporalAdjusters.lastDayOfMonth());
            LocalDate curr = primerDia;
            while (!curr.isAfter(ultimoDia)) {
                LocalDate finBloque = curr.plusDays(4);
                if (finBloque.isAfter(ultimoDia)) finBloque = ultimoDia;
                LocalDateTime bIni = curr.atStartOfDay();
                LocalDateTime bFin = finBloque.atTime(23, 59, 59);

                BigDecimal sumBlk = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(bIni) && !p.getFechaPago().isAfter(bFin))
                    .map(PagoSuscripcionTenant::getMonto)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                long cntBlk = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(bIni) && !p.getFechaPago().isAfter(bFin))
                    .count();

                Map<String, Object> pto = new LinkedHashMap<>();
                pto.put("etiqueta", "D" + curr.getDayOfMonth() + "-D" + finBloque.getDayOfMonth());
                pto.put("fecha", curr.toString());
                pto.put("montoUsd", sumBlk);
                pto.put("cantidad", cntBlk);
                tendencia.add(pto);

                curr = finBloque.plusDays(1);
            }
        } else {
            // HISTORICO
            for (int i = 5; i >= 0; i--) {
                LocalDate mDate = refDate.minusMonths(i);
                LocalDateTime mIni = mDate.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
                LocalDateTime mFin = mDate.with(TemporalAdjusters.lastDayOfMonth()).atTime(23, 59, 59);

                BigDecimal sumMes = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(mIni) && !p.getFechaPago().isAfter(mFin))
                    .map(PagoSuscripcionTenant::getMonto)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                long cntMes = pagosConfirmados.stream()
                    .filter(p -> p.getFechaPago() != null && !p.getFechaPago().isBefore(mIni) && !p.getFechaPago().isAfter(mFin))
                    .count();

                Map<String, Object> pto = new LinkedHashMap<>();
                pto.put("etiqueta", mDate.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, new Locale("es", "ES")) + " " + (mDate.getYear() % 100));
                pto.put("fecha", mDate.toString().substring(0, 7));
                pto.put("montoUsd", sumMes);
                pto.put("cantidad", cntMes);
                tendencia.add(pto);
            }
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("periodo", modo);
        respuesta.put("periodoLabel", periodoLabel);
        respuesta.put("fechaRef", refDate.toString());
        respuesta.put("fechaDesde", desde.toString());
        respuesta.put("fechaHasta", hasta.toString());

        // KPIs
        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("facturacionPeriodoUsd", facturacionPeriodo);
        kpis.put("facturacionHistoricaUsd", facturacionHistorica);
        kpis.put("cantidadPagosPeriodo", cantidadPagosPeriodo);
        kpis.put("ticketPromedioPeriodoUsd", ticketPromedioPeriodo);
        kpis.put("totalTenants", totalTenants);
        kpis.put("tenantsActivos", tenantsActivos);
        kpis.put("tenantsSuspendidos", tenantsSuspendidos);
        kpis.put("tasaRetencionPct", tasaRetencion);
        kpis.put("nuevosTenantsPeriodo", nuevosTenantsPeriodo);
        respuesta.put("kpis", kpis);

        // Secciones
        respuesta.put("topTenants", topTenants);
        respuesta.put("verticales", verticales);
        respuesta.put("planes", planes);
        respuesta.put("metodosPago", metodosPago);
        respuesta.put("tendencia", tendencia);

        return ResponseEntity.ok(respuesta);
    }


    @GetMapping("/auditoria")
    public ResponseEntity<Map<String, Object>> listarAuditoriaGlobal(
            @RequestParam(required = false) Long tenantId,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        if (registroAuditoriaRepository == null) {
            return ResponseEntity.ok(Map.of("content", Collections.emptyList(), "totalElements", 0, "totalPages", 0, "number", 0));
        }
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pagina, Math.min(tamano, 200), org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "fecha"));

        org.springframework.data.domain.Page<com.auroraplus.core.auditoria.entities.RegistroAuditoria> page;
        if (tenantId != null && modulo != null && !modulo.isBlank()) {
            page = registroAuditoriaRepository.findByTenantIdAndModuloOrderByFechaDesc(tenantId, modulo, pageable);
        } else if (tenantId != null) {
            page = registroAuditoriaRepository.findByTenantIdOrderByFechaDesc(tenantId, pageable);
        } else if (modulo != null && !modulo.isBlank()) {
            page = registroAuditoriaRepository.findByModuloOrderByFechaDesc(modulo, pageable);
        } else if (accion != null && !accion.isBlank()) {
            page = registroAuditoriaRepository.findByAccionOrderByFechaDesc(accion, pageable);
        } else {
            page = registroAuditoriaRepository.findAllByOrderByFechaDesc(pageable);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content", page.getContent());
        resp.put("totalElements", page.getTotalElements());
        resp.put("totalPages", page.getTotalPages());
        resp.put("number", page.getNumber());
        return ResponseEntity.ok(resp);
    }
}
