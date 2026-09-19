package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.ProcedimientoVeterinario;
import com.auroraplus.modules.veterinaria.repositories.ProcedimientoVeterinarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProcedimientoVeterinarioService {

    @Autowired
    private ProcedimientoVeterinarioRepository procedimientoVeterinarioRepository;

    public List<ProcedimientoVeterinario> listar() {
        return procedimientoVeterinarioRepository.findAllByOrderByNombreAsc();
    }

    @Transactional
    public ProcedimientoVeterinario crear(Long tenantId, ProcedimientoVeterinario proc) {
        proc.setId(null);
        proc.setTenantId(tenantId);
        return procedimientoVeterinarioRepository.save(proc);
    }

    @Transactional
    public void eliminar(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        ProcedimientoVeterinario proc = procedimientoVeterinarioRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Procedimiento no encontrado con ID: " + id));
        if (tenantId == null || !tenantId.equals(proc.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: el procedimiento no pertenece a este tenant");
        }
        procedimientoVeterinarioRepository.delete(proc);
    }
}
