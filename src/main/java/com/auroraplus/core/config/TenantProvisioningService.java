package com.auroraplus.core.config;

import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Alta de un tenant nuevo: usada tanto por el super-admin (panel interno)
 * como por el registro de autoservicio público (POST /api/auth/registro-negocio)
 * — misma lógica, dos puertas de entrada distintas.
 */
@Service
public class TenantProvisioningService {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private AdvisoryLock advisoryLock;

    @PersistenceContext
    private EntityManager entityManager;

    public static class AltaTenantRequest {
        public String nombreEmpresa;
        public String moduloPrincipal;
        public LicenciaTenant.TipoLicencia tipoLicencia;
        public String emailContacto;
        public String telefonoContacto;
        public Integer mesesVigencia;
        /** Si viene, manda sobre mesesVigencia: la prueba gratuita del registro público se mide en días. */
        public Integer diasVigencia;
        public String monedaBase;
        public String usuarioInicial;
        public String nombreUsuarioInicial;
        public String passwordInicial;
        public Boolean accesoTotal;
        public Integer limiteUsuarios;
    }

    @Transactional
    public LicenciaTenant crear(AltaTenantRequest request) {
        if (request.nombreEmpresa == null || request.nombreEmpresa.isBlank()) {
            throw new RuntimeException("El nombre de la empresa es obligatorio");
        }
        if (request.moduloPrincipal == null || request.moduloPrincipal.isBlank()) {
            throw new RuntimeException("El módulo principal es obligatorio");
        }
        if (request.tipoLicencia == null) {
            throw new RuntimeException("El tipo de licencia es obligatorio");
        }

        // HALLAZGO DE SEGURIDAD: "MAX(tenant_id)+1" sin serializar permitía que
        // dos altas de negocio simultáneas (dos POST /api/auth/registro-negocio
        // casi al mismo tiempo) leyeran el mismo MAX antes de que ninguna
        // terminara su transacción, y ambas terminaran usando el MISMO
        // tenant_id — dos negocios distintos mezclando datos y usuarios bajo
        // un solo tenant, la peor violación posible de aislamiento. El
        // advisory lock (mismo patrón ya usado en IdempotenciaService, ver
        // AdvisoryLock) obliga a que las altas de tenant se serialicen: la
        // segunda espera a que la primera termine su transacción completa
        // antes de calcular su propio MAX+1. El UNIQUE en
        // licencias_tenant.tenant_id (ver migración V2) es el candado de base
        // de datos por si este código se vuelve a romper. En Postgres real
        // usa el lock nativo; en H2 (tests, ver AdvisoryLock) cae a un mutex
        // en memoria con el mismo alcance transaccional — pg_advisory_xact_lock
        // no existe en H2.
        if (advisoryLock.esPostgres(entityManager)) {
            entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(445566)").getResultList();
        } else {
            advisoryLock.tomarBloqueoEnMemoria("tenant-provisioning");
        }
        Long nuevoTenantId = licenciaTenantRepository.buscarMaximoTenantId() + 1;
        int meses = request.mesesVigencia != null ? request.mesesVigencia : 1;

        LicenciaTenant licencia = new LicenciaTenant();
        licencia.setTenantId(nuevoTenantId);
        licencia.setNombreEmpresa(request.nombreEmpresa);
        licencia.setModuloPrincipal(request.moduloPrincipal);
        licencia.setTipoLicencia(request.tipoLicencia);
        licencia.setActiva(true);
        licencia.setFechaVencimientoPago(request.diasVigencia != null
            ? LocalDate.now().plusDays(request.diasVigencia)
            : LocalDate.now().plusMonths(meses));
        licencia.setEmailContacto(request.emailContacto);
        licencia.setTelefonoContacto(request.telefonoContacto);
        licencia.setFechaAlta(LocalDate.now());
        if (request.monedaBase != null && !request.monedaBase.isBlank()) {
            licencia.setMonedaBase(request.monedaBase);
        }
        if (request.limiteUsuarios != null && request.limiteUsuarios > 0) {
            licencia.setLimiteUsuarios(request.limiteUsuarios);
        }
        // El catálogo público (CatalogoPublicoController) solo resuelve tiendas por
        // slug — nunca por tenantId numérico, para no permitir enumeración
        // secuencial (IDOR). Sin esto, cada tenant nuevo nacía con slugCatalogo nulo
        // y quedaba con el catálogo público inaccesible hasta que el dueño entrara
        // manualmente a "Perfil de Tienda" a configurar uno — en la práctica, la
        // mayoría nunca lo haría. Se genera acá, dentro del mismo advisory lock que
        // ya serializa las altas de tenant, así la verificación de unicidad no tiene
        // condición de carrera entre altas simultáneas.
        licencia.setSlugCatalogo(generarSlugUnico(request.nombreEmpresa, nuevoTenantId));

        LicenciaTenant guardada = licenciaTenantRepository.save(licencia);

        // Sub-verticales que comparten el módulo/backend "salud" pero declaran su
        // propio moduloPrincipal para poder distinguirse en el frontend (ver
        // AuthContext.MODULO_A_INDUSTRIA) — mismo criterio ya usado para
        // Farmacia/Ferretería/Repuestos, que comparten el motor de Aurora Retail
        // con su propio moduloPrincipal. LicenciaService protege las rutas por el
        // nombre real del módulo ("salud"), no por esta etiqueta de negocio — sin
        // este mapeo, el ModuloTenant se activaba con el nombre de la etiqueta
        // ("odontologia") y el tenant quedaba sin acceso a ningún endpoint de
        // /api/salud/**.
        String moduloBackend = VARIANTES_DE_SALUD.contains(request.moduloPrincipal) ? "salud" : request.moduloPrincipal;

        ModuloTenant moduloInicial = new ModuloTenant();
        moduloInicial.setTenantId(nuevoTenantId);
        moduloInicial.setModuloNombre(moduloBackend);
        moduloInicial.setActivo(true);
        moduloTenantRepository.save(moduloInicial);

        // Comercio incluye Gestion de Personal (directorio, turnos, asistencia y metas) desde el alta.
        if (VERTICALES_COMERCIO.contains(moduloBackend)) {
            for (String flag : List.of("personal", "asistencia", "metas")) {
                ModuloTenant mt = new ModuloTenant();
                mt.setTenantId(nuevoTenantId);
                mt.setModuloNombre(flag);
                mt.setActivo(true);
                moduloTenantRepository.save(mt);
            }
        }

        if (Boolean.TRUE.equals(request.accesoTotal)) {
            if (licencia.getTipoLicencia().ordinal() < LicenciaTenant.TipoLicencia.INDUSTRIAL.ordinal()) {
                licencia.setTipoLicencia(LicenciaTenant.TipoLicencia.INDUSTRIAL);
                licenciaTenantRepository.save(licencia);
            }
            for (String mod : TODOS_LOS_MODULOS) {
                if (!mod.equals(moduloBackend)) {
                    ModuloTenant mt = new ModuloTenant();
                    mt.setTenantId(nuevoTenantId);
                    mt.setModuloNombre(mod);
                    mt.setActivo(true);
                    moduloTenantRepository.save(mt);
                }
            }
        }

        if (request.usuarioInicial != null && !request.usuarioInicial.isBlank()) {
            // Salud es "un solo médico por tenant" (ver MedicoTenantResolver): el
            // usuario inicial debe tener rol MEDICO para que el sistema lo reconozca
            // como el médico del consultorio y le auto-asigne citas/consultas —
            // DUENO_ADMIN no cuenta para ese resuelto, aunque igual tenga acceso.
            Usuario.Rol rolInicial = "salud".equals(moduloBackend) ? Usuario.Rol.MEDICO : Usuario.Rol.DUENO_ADMIN;
            String nombreUsuario = request.nombreUsuarioInicial != null && !request.nombreUsuarioInicial.isBlank()
                ? request.nombreUsuarioInicial.trim() : request.nombreEmpresa;
            authService.crearUsuario(nuevoTenantId, request.usuarioInicial, request.passwordInicial,
                rolInicial, nombreUsuario);
        }

        return guardada;
    }

    /**
     * Genera un slug de catálogo público único a partir del nombre comercial —
     * misma normalización que la migración V52 (minúsculas, no-alfanumérico a
     * guión, sin guiones al borde) para que un tenant migrado y uno nuevo se
     * vean iguales. Si el nombre queda vacío tras normalizar, o ya existe, se
     * le agrega el tenantId para garantizar unicidad sin volver a colisionar.
     */
    private String generarSlugUnico(String nombreEmpresa, Long tenantId) {
        String base = nombreEmpresa == null ? "" : nombreEmpresa.trim().toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "tienda-" + tenantId;
        }
        if (licenciaTenantRepository.findBySlugCatalogo(base).isEmpty()) {
            return base;
        }
        return base + "-" + tenantId;
    }

    private static final Set<String> VARIANTES_DE_SALUD = Set.of("odontologia");

    private static final Set<String> VERTICALES_COMERCIO = Set.of("repuestos", "ferreteria", "moda", "tamanaco-comercial", "farmacia");

    public static final Set<String> TODOS_LOS_MODULOS = Set.of(
        "salud", "ganaderia", "horeca", "repuestos", "farmacia", "ferreteria", "moda", "minero", "tamanaco-comercial"
    );
}
