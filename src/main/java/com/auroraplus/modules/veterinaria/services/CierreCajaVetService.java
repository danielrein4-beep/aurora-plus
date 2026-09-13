package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CierreCajaVet;
import com.auroraplus.modules.veterinaria.repositories.CierreCajaVetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CierreCajaVetService {

    @Autowired
    private CierreCajaVetRepository cierreCajaVetRepository;

    public List<CierreCajaVet> listarHistorial() {
        return cierreCajaVetRepository.findAllByOrderByCreadoEnDesc();
    }

    @Transactional
    public CierreCajaVet registrarCierre(Long tenantId, CierreCajaVet cierre) {
        cierre.setId(null);
        cierre.setTenantId(tenantId);
        return cierreCajaVetRepository.save(cierre);
    }

    @Transactional
    public void eliminarCierre(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        CierreCajaVet cierre = cierreCajaVetRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cierre de caja no encontrado con ID: " + id));
        if (tenantId == null || !tenantId.equals(cierre.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: el cierre de caja no pertenece a este tenant");
        }
        cierreCajaVetRepository.delete(cierre);
    }
}
