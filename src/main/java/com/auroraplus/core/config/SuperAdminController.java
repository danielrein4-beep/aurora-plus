package com.auroraplus.core.config;

import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Panel Super-Administrador (Fase 2.3): la única forma real de dar de alta un
 * cliente nuevo — antes de esto solo se podía insertando filas a mano en
 * licencias_tenant por SQL. Excluido del LicenciaInterceptor (ver WebConfig)
 * porque es quien gestiona las licencias de todos los demás.
 *
 * Protegido por TenantInterceptor: solo un token SUPER_ADMIN válido (ver
 * core.auth) puede llegar hasta aquí — sin login correcto, 401 antes de
 * ejecutar nada de este controlador.
 */
@RestController
@RequestMapping("/api/super-admin/tenants")
public class SuperAdminController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private TenantProvisioningService tenantProvisioningService;

    @GetMapping
    public List<LicenciaTenant> listar() {
        return licenciaTenantRepository.findAll();
    }

    @GetMapping("/{tenantId}")
    public LicenciaTenant obtener(@PathVariable Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
    }

    public static class CrearTenantRequest {
        public String nombreEmpresa;
        public String moduloPrincipal; // minero, horeca, repuestos, moda, tamanaco-comercial, ganaderia...
        public LicenciaTenant.TipoLicencia tipoLicencia;
        public String emailContacto;
        public String telefonoContacto;
        public Integer mesesVigencia; // opcional, por defecto 1 mes
        public String monedaBase; // opcional, por defecto USD (ver LicenciaTenant.monedaBase)
        // Opcional: si se informan, se crea de una vez el usuario Dueño/Administrador
        // inicial de este tenant (sin esto, el negocio quedaría dado de alta pero
        // sin ningún usuario que pueda entrar — habría que crearlo aparte con
        // POST /api/super-admin/tenants/{tenantId}/usuarios).
        public String usuarioInicial;
        public String passwordInicial;
    }

    /** Da de alta un cliente nuevo: le asigna un tenantId propio y su licencia inicial. */
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
        return ResponseEntity.ok(tenantProvisioningService.crear(alta));
    }

    public static class ActualizarTenantRequest {
        public String nombreEmpresa;
        public String moduloPrincipal;
        public String emailContacto;
        public String telefonoContacto;
        public String monedaBase;
    }

    @PutMapping("/{tenantId}")
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
        // El pago renueva desde la fecha de vencimiento actual si aún no venció (no se pierden días
        // pagados), o desde hoy si ya venció.
        LocalDate base = licencia.getFechaVencimientoPago().isAfter(LocalDate.now()) ? licencia.getFechaVencimientoPago() : LocalDate.now();
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

    // --- Licenciamiento por módulo: un tenant puede tener varios módulos de
    // industria contratados a la vez (ej. minería + salud) — ver ModuloTenant.

    @GetMapping("/{tenantId}/modulos")
    public List<ModuloTenant> listarModulos(@PathVariable Long tenantId) {
        return moduloTenantRepository.findByTenantId(tenantId);
    }

    public static class ModuloRequest {
        public String moduloNombre;
        public boolean activo;
    }

    /** Activa o desactiva (crea si no existe) el módulo indicado para este tenant. */
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

    // --- Usuarios de un tenant: el super-admin puede crear/reiniciar el acceso
    // de cualquier negocio (ej. el dueño olvidó su contraseña, o un tenant
    // dado de alta antes de que existiera login todavía no tiene usuarios).

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
}
