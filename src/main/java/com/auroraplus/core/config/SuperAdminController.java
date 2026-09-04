package com.auroraplus.core.config;

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
 * ADVERTENCIA DE SEGURIDAD: estos endpoints no tienen ninguna autenticación
 * todavía — el proyecto no tiene un sistema de login/roles construido. Antes
 * de exponer esto fuera de una red de confianza, hay que protegerlo (login +
 * rol super-admin como mínimo). No es un descuido: es un hueco conocido y
 * pendiente, documentado aquí a propósito.
 */
@RestController
@RequestMapping("/api/super-admin/tenants")
public class SuperAdminController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

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
    }

    /** Da de alta un cliente nuevo: le asigna un tenantId propio y su licencia inicial. */
    @PostMapping
    @Transactional
    public ResponseEntity<LicenciaTenant> crear(@RequestBody CrearTenantRequest request) {
        if (request.nombreEmpresa == null || request.nombreEmpresa.isBlank()) {
            throw new RuntimeException("El nombre de la empresa es obligatorio");
        }
        if (request.moduloPrincipal == null || request.moduloPrincipal.isBlank()) {
            throw new RuntimeException("El módulo principal es obligatorio (ej: minero, repuestos, moda, horeca, tamanaco-comercial)");
        }
        if (request.tipoLicencia == null) {
            throw new RuntimeException("El tipo de licencia es obligatorio");
        }

        Long nuevoTenantId = licenciaTenantRepository.buscarMaximoTenantId() + 1;
        int meses = request.mesesVigencia != null ? request.mesesVigencia : 1;

        LicenciaTenant licencia = new LicenciaTenant();
        licencia.setTenantId(nuevoTenantId);
        licencia.setNombreEmpresa(request.nombreEmpresa);
        licencia.setModuloPrincipal(request.moduloPrincipal);
        licencia.setTipoLicencia(request.tipoLicencia);
        licencia.setActiva(true);
        licencia.setFechaVencimientoPago(LocalDate.now().plusMonths(meses));
        licencia.setEmailContacto(request.emailContacto);
        licencia.setTelefonoContacto(request.telefonoContacto);
        licencia.setFechaAlta(LocalDate.now());
        if (request.monedaBase != null && !request.monedaBase.isBlank()) {
            licencia.setMonedaBase(request.monedaBase);
        }

        LicenciaTenant guardada = licenciaTenantRepository.save(licencia);

        // Al dar de alta el tenant, su módulo principal queda contratado y activo
        // desde ya en modulos_tenant — sin este paso el LicenciaInterceptor
        // bloquearía con 403 al tenant recién creado en su propio módulo.
        ModuloTenant moduloInicial = new ModuloTenant();
        moduloInicial.setTenantId(nuevoTenantId);
        moduloInicial.setModuloNombre(request.moduloPrincipal);
        moduloInicial.setActivo(true);
        moduloTenantRepository.save(moduloInicial);

        return ResponseEntity.ok(guardada);
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
}
