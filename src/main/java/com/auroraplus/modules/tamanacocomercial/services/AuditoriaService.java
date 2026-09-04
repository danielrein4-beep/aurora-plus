package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.entities.Auditoria;
import com.auroraplus.modules.tamanacocomercial.repositories.AuditoriaRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AuditoriaService {

    @Autowired
    private AuditoriaRepository auditoriaRepository;

    @Autowired
    private HttpServletRequest request;

    public void registrar(Long tenantId, String accion, String modulo, String detalle) {
        String usuario = "Sistema/Admin";

        String ip = null;
        if (request != null) {
            ip = request.getRemoteAddr();
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader != null && !xfHeader.isEmpty()) {
                ip = xfHeader.split(",")[0];
            }
        }

        Auditoria aud = new Auditoria();
        aud.setTenantId(tenantId);
        aud.setUsuario(usuario);
        aud.setAccion(accion);
        aud.setModulo(modulo);
        aud.setDetalle(detalle);
        aud.setIpOrigen(ip);
        auditoriaRepository.save(aud);
    }
}
