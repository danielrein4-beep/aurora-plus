package com.auroraplus.modules.salud.services;

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

    public List<CotizacionMedica> listar(Long tenantId) {
        return cotizacionMedicaRepository.findByTenantIdOrderByCreadoEnDesc(tenantId);
    }

    @Transactional
    public CotizacionMedica crear(Long tenantId, CotizacionMedica cotizacion) {
        cotizacion.setId(null);
        cotizacion.setTenantId(tenantId);
        return cotizacionMedicaRepository.save(cotizacion);
    }

    /** findById() no respeta el filtro de tenant (ver hallazgo en ConsultaMedicaService). */
    private CotizacionMedica obtenerCotizacionPropia(Long tenantId, Long id) {
        return cotizacionMedicaRepository.findByTenantIdAndId(tenantId, id)
            .orElseThrow(() -> new RuntimeException("Cotización no encontrada (o no pertenece a este tenant)"));
    }

    @Transactional
    public CotizacionMedica actualizarEstado(Long tenantId, Long id, CotizacionMedica.EstadoCotizacion nuevoEstado) {
        CotizacionMedica cotizacion = obtenerCotizacionPropia(tenantId, id);
        cotizacion.setEstado(nuevoEstado);
        return cotizacionMedicaRepository.save(cotizacion);
    }

    @Transactional
    public void eliminar(Long tenantId, Long id) {
        cotizacionMedicaRepository.delete(obtenerCotizacionPropia(tenantId, id));
    }
}
