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

    public List<CierreCaja> listarHistorial() {
        return cierreCajaRepository.findAllByOrderByCreadoEnDesc();
    }

    @Transactional
    public CierreCaja registrarCierre(Long tenantId, CierreCaja cierre) {
        cierre.setId(null);
        cierre.setTenantId(tenantId);
        return cierreCajaRepository.save(cierre);
    }

    @Transactional
    public void eliminarCierre(Long id) {
        cierreCajaRepository.deleteById(id);
    }
}
