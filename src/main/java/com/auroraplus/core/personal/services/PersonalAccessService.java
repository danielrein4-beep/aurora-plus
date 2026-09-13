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

    /** El AUDITOR (y cualquier otro rol de solo lectura) nunca puede pasar una exigencia de escritura. */
    public void exigirNoAuditor(Long tenantId) {
        if (esDuenoAdmin()) return;
        Optional<PermisoPersonal.RolPersonal> rol = obtenerRolPersonalActual(tenantId);
        if (rol.isPresent() && rol.get() == PermisoPersonal.RolPersonal.AUDITOR) {
            throw new AccesoPersonalDenegadoException("El rol AUDITOR es de solo lectura");
        }
    }

    /** Para que un EMPLEADO solo pueda leer su propio recibo/asistencia, nunca la de otro. */
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
