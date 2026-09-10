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

    public List<CotizacionMedica> listar() {
        return cotizacionMedicaRepository.findAllByOrderByCreadoEnDesc();
    }

    @Transactional
    public CotizacionMedica crear(Long tenantId, CotizacionMedica cotizacion) {
        cotizacion.setId(null);
        cotizacion.setTenantId(tenantId);
        return cotizacionMedicaRepository.save(cotizacion);
    }

    @Transactional
    public CotizacionMedica actualizarEstado(Long id, CotizacionMedica.EstadoCotizacion nuevoEstado) {
        CotizacionMedica cotizacion = cotizacionMedicaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cotización no encontrada con ID: " + id));
        cotizacion.setEstado(nuevoEstado);
        return cotizacionMedicaRepository.save(cotizacion);
    }

    @Transactional
    public void eliminar(Long id) {
        cotizacionMedicaRepository.deleteById(id);
    }
}
