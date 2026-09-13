package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.AuditoriaPersonal;
import com.auroraplus.core.personal.repositories.AuditoriaPersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * docs/personal-nomina-contract.md §1.4 — "detalle" describe QUÉ cambió estructuralmente y NUNCA
 * lleva montos ni datos salariales. Quien llame a este service es responsable de construir un
 * detalle que respete esa regla — este método no valida contenido, solo persiste.
 */
@Service
public class AuditoriaPersonalService {

    @Autowired
    private AuditoriaPersonalRepository auditoriaPersonalRepository;

    public void registrar(Long tenantId, Long usuarioId, String accion, String entidad, Long entidadId, String detalle) {
        AuditoriaPersonal registro = new AuditoriaPersonal();
        registro.setTenantId(tenantId);
        registro.setUsuarioId(usuarioId);
        registro.setAccion(accion);
        registro.setEntidad(entidad);
        registro.setEntidadId(entidadId);
        registro.setDetalle(detalle);
        auditoriaPersonalRepository.save(registro);
    }
}
