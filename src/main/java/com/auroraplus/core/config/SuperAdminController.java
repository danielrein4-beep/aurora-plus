package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import com.auroraplus.core.auth.services.JwtService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.entities.PagoSuscripcionTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.config.repositories.PagoSuscripcionTenantRepository;
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
        public String moduloPrincipal; // minero, horeca, repuestos, moda, tamanaco-comercial, ganaderia, salud...
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
        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
    }

    @PostMapping("/{tenantId}/desactivar")
    public ResponseEntity<LicenciaTenant> desactivar(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setActiva(false);
        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
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

}
