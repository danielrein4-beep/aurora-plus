package com.auroraplus.core.auditoria.services;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.entities.RegistroAuditoria;
import com.auroraplus.core.auditoria.repositories.RegistroAuditoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Punto único para dejar constancia de una acción sensible (crear/editar/eliminar,
 * o una acción de negocio equivalente) en la bitácora de auditoría del tenant.
 * Se llama DESPUÉS de que la operación ya se completó con éxito — nunca antes,
 * para no registrar acciones que en realidad fallaron.
 *
 * Además de las llamadas explícitas hechas a mano (con una descripción legible,
 * ej. "Anuló una comanda — motivo: X"), AuditoriaAutoInterceptor genera un
 * registro genérico para CUALQUIER POST/PUT/PATCH/DELETE exitoso de la API que
 * no haya llamado ya a este método — así ninguna acción de crear/editar/eliminar
 * queda sin rastro, aunque nadie haya instrumentado ese endpoint específico. El
 * flag de este hilo evita que ambos caminos dupliquen el mismo registro.
 */
@Service
public class RegistroAuditoriaService {

    private static final ThreadLocal<Boolean> YA_REGISTRADO_EN_ESTA_REQUEST = ThreadLocal.withInitial(() -> false);

    @Autowired
    private RegistroAuditoriaRepository registroAuditoriaRepository;

    public void registrar(Long tenantId, String modulo, String accion, String entidad, Object entidadId, String descripcion) {
        RegistroAuditoria r = new RegistroAuditoria();
        r.setTenantId(tenantId);
        r.setModulo(modulo);
        r.setAccion(accion);
        r.setEntidad(entidad);
        r.setEntidadId(entidadId != null ? entidadId.toString() : null);
        r.setDescripcion(descripcion);
        String usuario = AuthContext.getUsername();
        r.setUsuario(usuario != null ? usuario : "sistema");
        r.setRolUsuario(AuthContext.getRol());
        registroAuditoriaRepository.save(r);
        YA_REGISTRADO_EN_ESTA_REQUEST.set(true);
    }

    /**
     * Para un POST que no modifica datos (p. ej. una vista previa que solo valida):
     * evita que AuditoriaAutoInterceptor lo anote como "CREAR" sin haber creado nada.
     */
    public void omitirRegistroAutomatico() {
        YA_REGISTRADO_EN_ESTA_REQUEST.set(true);
    }

    /** Usado solo por AuditoriaAutoInterceptor para saber si ya se registró esta request a mano. */
    public boolean yaRegistradoEnEstaRequest() {
        return YA_REGISTRADO_EN_ESTA_REQUEST.get();
    }

    /** Debe llamarse siempre al final de cada request (afterCompletion), incluso si no hubo registro. */
    public void limpiarFlagDeRequest() {
        YA_REGISTRADO_EN_ESTA_REQUEST.remove();
    }
}
