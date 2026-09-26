package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Motor de Licenciamiento (Fase 2.2 del Plan Maestro): valida que un tenant
 * tenga una licencia activa y vigente, y que su nivel de licencia alcance
 * para el módulo que está intentando usar.
 *
 * Mapeo de nivel mínimo requerido por módulo — no está especificado en el
 * plan, así que lo defino aquí explícitamente y de forma ajustable: los
 * módulos "core" (config, financiero, inventario base, reportes, logística
 * básica) son parte de BASICA porque el propio plan dice que ningún vertical
 * funciona sin ellos. Cada vertical de industria (horeca, repuestos, comercio)
 * requiere COMERCIAL. El despliegue a medida de un cliente real completo
 * (tamanaco-comercial) requiere INDUSTRIAL, el nivel más alto.
 */
@Service
public class LicenciaService {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    private static final Map<String, LicenciaTenant.TipoLicencia> NIVEL_REQUERIDO_POR_MODULO = new LinkedHashMap<>();

    static {
        NIVEL_REQUERIDO_POR_MODULO.put("super-admin", null); // sin restricción de licencia (lo gestiona el propio super-admin)
        // Un negocio vencido tiene que poder ver su suscripción, reportar su pago y hablar con soporte.
        NIVEL_REQUERIDO_POR_MODULO.put("suscripcion", null);
        NIVEL_REQUERIDO_POR_MODULO.put("tenant", null);
        NIVEL_REQUERIDO_POR_MODULO.put("horeca", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("repuestos", LicenciaTenant.TipoLicencia.COMERCIAL);
        // Farmacia, Ferretería y Comercio comparten el mismo motor que Repuestos
        // (Aurora Retail: mostrador + POS + inventario sobre el núcleo core) —
        // mismo nivel de licencia que el resto de verticales de industria.
        // "comercio" es el nombre unificado (Ferretería/Repuestos/Retail bajo
        // un solo nombre); "ferreteria"/"repuestos" se mantienen para tenants
        // ya registrados con esos valores.
        NIVEL_REQUERIDO_POR_MODULO.put("farmacia", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("ferreteria", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("comercio", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("ganaderia", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("salud", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("tamanaco-comercial", LicenciaTenant.TipoLicencia.INDUSTRIAL);
        // Cualquier otro módulo (financiero, inventario, logística) se considera núcleo -> BASICA
    }

    // Verticales de industria que requieren estar EXPLÍCITAMENTE contratadas en
    // ModuloTenant (tabla modulos_tenant) para que el tenant pueda acceder —
    // un tenant puede tener varias activas a la vez (ej. minería + salud), a
    // diferencia del viejo esquema de un solo "moduloPrincipal" exclusivo. Los
    // módulos núcleo (financiero, inventario, reportes, config) no están en
    // esta lista y siguen abiertos a cualquier tenant con licencia activa.
    private static final Set<String> VERTICALES_CONTROLADAS = Set.of(
        "horeca", "repuestos", "farmacia", "ferreteria", "comercio", "ganaderia", "salud", "tamanaco-comercial"
    );

    public static class ResultadoValidacion {
        public final boolean permitido;
        public final int codigoHttp;
        public final String mensaje;

        private ResultadoValidacion(boolean permitido, int codigoHttp, String mensaje) {
            this.permitido = permitido;
            this.codigoHttp = codigoHttp;
            this.mensaje = mensaje;
        }

        static ResultadoValidacion ok() {
            return new ResultadoValidacion(true, 200, null);
        }

        static ResultadoValidacion bloqueado(int codigoHttp, String mensaje) {
            return new ResultadoValidacion(false, codigoHttp, mensaje);
        }
    }

    /**
     * Valida la licencia del tenant para acceder al módulo indicado por la
     * ruta (ej: "/api/minero/..." -> módulo "minero").
     */
    /**
     * Días que el negocio sigue trabajando después de la fecha de vencimiento, para que un pago
     * que se retrasa un par de días no le corte la operación de golpe. El Hub se lo avisa.
     */
    public static final int DIAS_GRACIA = 3;

    /**
     * Si el cliente ya reportó su pago y el equipo de Aurora todavía no lo verifica, no se le corta
     * el servicio por vencimiento: la demora es nuestra. El reporte cuenta por este máximo de días
     * para que un reporte olvidado no deje acceso abierto para siempre.
     */
    public static final int DIAS_MAX_ESPERA_VERIFICACION = 15;
    public static final java.util.List<String> ESTADOS_PAGO_PENDIENTE = java.util.List.of("ABIERTO", "EN_ATENCION", "EN_PROCESO");

    @org.springframework.beans.factory.annotation.Autowired
    private com.auroraplus.core.soporte.repositories.SaasSoporteTicketRepository soporteTicketRepository;

    public boolean tienePagoReportadoPendiente(Long tenantId) {
        return soporteTicketRepository.existsByTenantIdAndCategoriaAndEstadoInAndFechaCreacionAfter(
            tenantId, "PAGO", ESTADOS_PAGO_PENDIENTE, java.time.LocalDateTime.now().minusDays(DIAS_MAX_ESPERA_VERIFICACION));
    }

    public ResultadoValidacion validarAcceso(Long tenantId, String pathModulo) {
        LicenciaTenant.TipoLicencia nivelRequerido = NIVEL_REQUERIDO_POR_MODULO.getOrDefault(pathModulo, LicenciaTenant.TipoLicencia.BASICA);
        if (nivelRequerido == null) {
            return ResultadoValidacion.ok(); // módulo exento (ej. super-admin)
        }

        Optional<LicenciaTenant> licenciaOpt = licenciaTenantRepository.findByTenantId(tenantId);
        if (licenciaOpt.isEmpty()) {
            return ResultadoValidacion.bloqueado(402,
                "El tenant " + tenantId + " no tiene una licencia registrada. Contacte al administrador del sistema.");
        }

        LicenciaTenant licencia = licenciaOpt.get();

        if (!licencia.isActiva()) {
            return ResultadoValidacion.bloqueado(402,
                "La licencia de este tenant está desactivada. Regularice su suscripción para continuar.");
        }

        if (licencia.getFechaVencimientoPago() != null && licencia.getFechaVencimientoPago().plusDays(DIAS_GRACIA).isBefore(LocalDate.now())
                && !tienePagoReportadoPendiente(tenantId)) {
            return ResultadoValidacion.bloqueado(402,
                "Tu plan venció el " + licencia.getFechaVencimientoPago() + ". Reporta tu pago desde Aurora Hub > Facturación & Pagos para reactivar el acceso.");
        }

        // Cuenta de verificacion creada por el superadmin: recorre todas las verticales sin
        // depender del plan ni de los modulos contratados (sigue sujeta a activa y vencimiento).
        if (licencia.isPermiteCambioVertical()) {
            return ResultadoValidacion.ok();
        }

        if (licencia.getTipoLicencia().ordinal() < nivelRequerido.ordinal()) {
            return ResultadoValidacion.bloqueado(403,
                "Su licencia actual (" + licencia.getTipoLicencia() + ") no incluye el módulo '" + pathModulo
                    + "'. Se requiere licencia " + nivelRequerido + " o superior.");
        }

        if (VERTICALES_CONTROLADAS.contains(pathModulo)) {
            boolean habilitado = moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, pathModulo)
                .map(ModuloTenant::isActivo)
                .orElse(false);
            if (!habilitado && "comercio".equals(pathModulo)) {
                habilitado = moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, "ferreteria").map(ModuloTenant::isActivo).orElse(false)
                        || moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, "repuestos").map(ModuloTenant::isActivo).orElse(false)
                        || moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, "moda").map(ModuloTenant::isActivo).orElse(false)
                        || moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, "tamanaco-comercial").map(ModuloTenant::isActivo).orElse(false);
            }
            if (!habilitado) {
                return ResultadoValidacion.bloqueado(403,
                    "Este negocio no tiene contratado el modulo '" + pathModulo
                        + "'. Contacte al administrador si desea activarlo.");
            }
        }

        return ResultadoValidacion.ok();
    }

    /**
     * Módulos verticales activos de un tenant — lo que el frontend debe leer
     * al iniciar sesión para armar el sidebar dinámico (ver ModuloTenantController).
     */
    public java.util.List<String> obtenerModulosActivos(Long tenantId) {
        return moduloTenantRepository.findByTenantIdAndActivoTrue(tenantId).stream()
            .map(ModuloTenant::getModuloNombre)
            .toList();
    }

    /** Nivel mínimo de licencia que exige un módulo — usado también al contratar una vertical adicional (ver ModuloTenantController.agregarModulo). */
    public LicenciaTenant.TipoLicencia nivelRequeridoPara(String modulo) {
        return NIVEL_REQUERIDO_POR_MODULO.getOrDefault(modulo, LicenciaTenant.TipoLicencia.BASICA);
    }

    /** Si el nombre corresponde a una vertical de industria real (y no a un módulo núcleo o inexistente). */
    public boolean esVerticalControlada(String modulo) {
        return VERTICALES_CONTROLADAS.contains(modulo);
    }
}
