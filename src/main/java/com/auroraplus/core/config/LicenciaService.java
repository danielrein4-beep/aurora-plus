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
 * funciona sin ellos. Cada vertical de industria (minero, horeca, repuestos)
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
        NIVEL_REQUERIDO_POR_MODULO.put("minero", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("horeca", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("repuestos", LicenciaTenant.TipoLicencia.COMERCIAL);
        NIVEL_REQUERIDO_POR_MODULO.put("moda", LicenciaTenant.TipoLicencia.COMERCIAL);
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
        "minero", "horeca", "repuestos", "moda", "ganaderia", "salud", "tamanaco-comercial"
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

        if (licencia.getFechaVencimientoPago() != null && licencia.getFechaVencimientoPago().isBefore(LocalDate.now())) {
            return ResultadoValidacion.bloqueado(402,
                "La licencia de este tenant venció el " + licencia.getFechaVencimientoPago() + ". Renueve el pago para reactivar el acceso.");
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
            if (!habilitado) {
                return ResultadoValidacion.bloqueado(403,
                    "Este negocio no tiene contratado el módulo '" + pathModulo
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
}
