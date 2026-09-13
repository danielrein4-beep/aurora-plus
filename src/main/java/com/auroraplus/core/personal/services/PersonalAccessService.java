package com.auroraplus.core.personal.services;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import com.auroraplus.core.personal.entities.PermisoPersonal;
import com.auroraplus.core.personal.repositories.PermisoPersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

/**
 * Punto único de control de acceso para todo el módulo Personal/Nómina — docs/personal-nomina-
 * contract.md §1.2 y §1.3. Cada service del módulo llama a esto ANTES de tocar datos: nunca se
 * confía en que el controlador ya validó, porque un service puede llamarse desde más de un sitio.
 */
@Service
public class PersonalAccessService {

    public static final String FLAG_PERSONAL = "personal";
    public static final String FLAG_ASISTENCIA = "asistencia";
    public static final String FLAG_METAS = "metas";
    public static final String FLAG_NOMINA_AVANZADA = "nomina-avanzada";

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @Autowired
    private PermisoPersonalRepository permisoPersonalRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    /** Lanza si el tenant no tiene el feature flag activo — nunca se devuelve una lista vacía silenciosa en su lugar. */
    public void exigirFlag(Long tenantId, String flag) {
        boolean activo = moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, flag)
            .map(ModuloTenant::isActivo).orElse(false);
        if (!activo) {
            throw new AccesoPersonalDenegadoException("Este negocio no tiene activado el módulo \"" + flag + "\"");
        }
    }

    /** DUENO_ADMIN (rol global) tiene acceso total sin necesitar PermisoPersonal — es el dueño del negocio. */
    public boolean esDuenoAdmin() {
        return "DUENO_ADMIN".equals(AuthContext.getRol());
    }

    public Long resolverUsuarioIdActual(Long tenantId) {
        return usuarioRepository.buscarPorTenantYUsername(tenantId, AuthContext.getUsername())
            .map(Usuario::getId)
            .orElseThrow(() -> new AccesoPersonalDenegadoException("No se pudo resolver el usuario autenticado"));
    }

    public Optional<PermisoPersonal.RolPersonal> obtenerRolPersonalActual(Long tenantId) {
        Long usuarioId = resolverUsuarioIdActual(tenantId);
        return permisoPersonalRepository.findByTenantIdAndUsuarioId(tenantId, usuarioId).map(PermisoPersonal::getRol);
    }

    /** Lanza si el usuario actual no es dueño ni tiene uno de los roles permitidos para esta acción. */
    public void exigirRol(Long tenantId, Set<PermisoPersonal.RolPersonal> rolesPermitidos) {
        if (esDuenoAdmin()) return;
        PermisoPersonal.RolPersonal rol = obtenerRolPersonalActual(tenantId)
            .orElseThrow(() -> new AccesoPersonalDenegadoException("Este usuario no tiene permisos asignados en Personal/Nómina"));
        if (!rolesPermitidos.contains(rol)) {
            throw new AccesoPersonalDenegadoException("El rol " + rol + " no tiene permiso para esta acción");
        }
    }

    // RRHH/NOMINA/SUPERVISOR/AUDITOR administran o supervisan personal en general (turnos,
    // asistencia, metas) — ninguno de estos ve MONTOS de nómina salvo NOMINA/AUDITOR, ver
    // exigirVerNominaDe más abajo. Un usuario SIN PermisoPersonal (ni dueño) queda fuera de
    // TODO — antes exigirNoAuditor lo dejaba pasar por error (solo bloqueaba AUDITOR
    // explícitamente), hallazgo real de la revisión de Codex.
    private static final Set<PermisoPersonal.RolPersonal> PUEDEN_VER_DIRECTORIO_PERSONAL =
        EnumSet.of(PermisoPersonal.RolPersonal.RRHH, PermisoPersonal.RolPersonal.NOMINA,
            PermisoPersonal.RolPersonal.SUPERVISOR, PermisoPersonal.RolPersonal.AUDITOR);

    private static final Set<PermisoPersonal.RolPersonal> PUEDEN_VER_MONTOS_DE_CUALQUIERA =
        EnumSet.of(PermisoPersonal.RolPersonal.NOMINA, PermisoPersonal.RolPersonal.AUDITOR);

    /** Directorio de personal (nombres/cargos, SIN montos) — RRHH/NOMINA/SUPERVISOR/AUDITOR, nunca EMPLEADO ni un usuario sin permiso. */
    public void exigirVerDirectorioPersonal(Long tenantId) {
        exigirRol(tenantId, PUEDEN_VER_DIRECTORIO_PERSONAL);
    }

    /**
     * Ver los MONTOS de nómina de un empleado puntual — docs/personal-nomina-contract.md §1.2:
     * RRHH gestiona personal pero NUNCA ve montos de nómina calculada. Solo NOMINA/AUDITOR ven
     * la de cualquiera; un EMPLEADO solo la suya propia; cualquier otro rol (incluido RRHH,
     * SUPERVISOR, o ningún permiso) queda denegado.
     */
    public void exigirVerNominaDe(Long tenantId, Long empleadoId) {
        if (esDuenoAdmin()) return;
        PermisoPersonal permiso = permisoPersonalRepository.findByTenantIdAndUsuarioId(tenantId, resolverUsuarioIdActual(tenantId))
            .orElseThrow(() -> new AccesoPersonalDenegadoException("Este usuario no tiene permisos asignados en Personal/Nómina"));
        if (PUEDEN_VER_MONTOS_DE_CUALQUIERA.contains(permiso.getRol())) return;
        if (permiso.getRol() == PermisoPersonal.RolPersonal.EMPLEADO
                && empleadoId != null && empleadoId.equals(permiso.getEmpleadoId())) {
            return;
        }
        throw new AccesoPersonalDenegadoException("No tienes permiso para ver la nómina de este empleado");
    }

    /** Igual que exigirVerNominaDe, pero para consultas que no traen un empleadoId puntual (ej. listar todo un período). */
    public void exigirVerMontosDeNominaEnGeneral(Long tenantId) {
        exigirRol(tenantId, PUEDEN_VER_MONTOS_DE_CUALQUIERA);
    }

    /** Para que un EMPLEADO solo pueda leer su propia asistencia/metas (no montos de nómina), nunca la de otro. */
    public Long empleadoIdPropioSiAplica(Long tenantId) {
        if (esDuenoAdmin()) return null; // sin restricción
        Long usuarioId = resolverUsuarioIdActual(tenantId);
        return permisoPersonalRepository.findByTenantIdAndUsuarioId(tenantId, usuarioId)
            .filter(p -> p.getRol() == PermisoPersonal.RolPersonal.EMPLEADO)
            .map(PermisoPersonal::getEmpleadoId)
            .orElse(null);
    }

    public static class AccesoPersonalDenegadoException extends RuntimeException {
        public AccesoPersonalDenegadoException(String mensaje) { super(mensaje); }
    }
}
