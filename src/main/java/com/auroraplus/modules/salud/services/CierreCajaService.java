package com.auroraplus.modules.salud.services;

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

    public List<CierreCaja> listarHistorial(Long tenantId) {
        return cierreCajaRepository.findByTenantIdOrderByCreadoEnDesc(tenantId);
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
    public void eliminarCierre(Long tenantId, Long id) {
        CierreCaja cierre = cierreCajaRepository.findByTenantIdAndId(tenantId, id)
            .orElseThrow(() -> new RuntimeException("Cierre de caja no encontrado (o no pertenece a este tenant)"));
        cierreCajaRepository.delete(cierre);
    }
}
