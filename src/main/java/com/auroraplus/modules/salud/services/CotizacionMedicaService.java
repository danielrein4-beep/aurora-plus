package com.auroraplus.modules.salud.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CotizacionMedica;
import com.auroraplus.modules.salud.repositories.CotizacionMedicaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CotizacionMedicaService {

    @Autowired
    private CotizacionMedicaRepository cotizacionMedicaRepository;

    public List<CotizacionMedica> listar() {
        return cotizacionMedicaRepository.findAllByOrderByCreadoEnDesc();
    }

    @Transactional
    public CotizacionMedica crear(Long tenantId, CotizacionMedica cotizacion) {
        cotizacion.setId(null);
        cotizacion.setTenantId(tenantId);
        return cotizacionMedicaRepository.save(cotizacion);
    }

    /** findById() no respeta el filtro de tenant (ver hallazgo en ConsultaMedicaService). */
    private CotizacionMedica obtenerCotizacionPropia(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        CotizacionMedica cotizacion = cotizacionMedicaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cotización no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(cotizacion.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la cotización no pertenece a este tenant");
        }
        return cotizacion;
    }

    @Transactional
    public CotizacionMedica actualizarEstado(Long id, CotizacionMedica.EstadoCotizacion nuevoEstado) {
        CotizacionMedica cotizacion = obtenerCotizacionPropia(id);
        cotizacion.setEstado(nuevoEstado);
        return cotizacionMedicaRepository.save(cotizacion);
    }

    @Transactional
    public void eliminar(Long id) {
        cotizacionMedicaRepository.delete(obtenerCotizacionPropia(id));
    }
}
