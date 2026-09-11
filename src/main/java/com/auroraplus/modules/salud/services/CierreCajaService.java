package com.auroraplus.modules.salud.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CierreCaja;
import com.auroraplus.modules.salud.repositories.CierreCajaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CierreCajaService {

    @Autowired
    private CierreCajaRepository cierreCajaRepository;

    public List<CierreCaja> listarHistorial() {
        return cierreCajaRepository.findAllByOrderByCreadoEnDesc();
    }

    @Transactional
    public CierreCaja registrarCierre(Long tenantId, CierreCaja cierre) {
        cierre.setId(null);
        cierre.setTenantId(tenantId);
        return cierreCajaRepository.save(cierre);
    }

    // findById() no respeta el filtro de tenant (mismo hallazgo de seguridad ya corregido
    // en el resto del módulo) — sin este chequeo, cualquier tenant podía borrar el cierre
    // de caja auditado de OTRO tenant con solo adivinar el id.
    @Transactional
    public void eliminarCierre(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        CierreCaja cierre = cierreCajaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cierre de caja no encontrado con ID: " + id));
        if (tenantId == null || !tenantId.equals(cierre.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: el cierre de caja no pertenece a este tenant");
        }
        cierreCajaRepository.delete(cierre);
    }
}
