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
 */
@Service
public class RegistroAuditoriaService {

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
    }
}
