package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CotizacionVeterinaria;
import com.auroraplus.modules.veterinaria.repositories.CotizacionVeterinariaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CotizacionVeterinariaService {

    @Autowired
    private CotizacionVeterinariaRepository cotizacionVeterinariaRepository;

    public List<CotizacionVeterinaria> listar() {
        return cotizacionVeterinariaRepository.findAllByOrderByCreadoEnDesc();
    }

    public List<CotizacionVeterinaria> listarPorMascota(Long mascotaId) {
        return cotizacionVeterinariaRepository.findByMascotaIdOrderByCreadoEnDesc(mascotaId);
    }

    @Transactional
    public CotizacionVeterinaria crear(Long tenantId, CotizacionVeterinaria cotizacion) {
        cotizacion.setId(null);
        cotizacion.setTenantId(tenantId);
        return cotizacionVeterinariaRepository.save(cotizacion);
    }

    private CotizacionVeterinaria obtenerCotizacionPropia(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        CotizacionVeterinaria cotizacion = cotizacionVeterinariaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cotización no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(cotizacion.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la cotización no pertenece a este tenant");
        }
        return cotizacion;
    }

    @Transactional
    public CotizacionVeterinaria actualizarEstado(Long id, CotizacionVeterinaria.EstadoCotizacion nuevoEstado) {
        CotizacionVeterinaria cotizacion = obtenerCotizacionPropia(id);
        cotizacion.setEstado(nuevoEstado);
        return cotizacionVeterinariaRepository.save(cotizacion);
    }

    @Transactional
    public void eliminar(Long id) {
        cotizacionVeterinariaRepository.delete(obtenerCotizacionPropia(id));
    }
}
