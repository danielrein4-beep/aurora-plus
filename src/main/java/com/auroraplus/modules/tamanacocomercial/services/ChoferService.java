package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.entities.Chofer;
import com.auroraplus.modules.tamanacocomercial.repositories.ChoferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class ChoferService {

    @Autowired
    private ChoferRepository choferRepository;

    /** Busca el chofer por cédula; si no existe lo crea con el nombre dado. */
    public Chofer findOrCreateDriver(Long tenantId, String cedula, String nombreCompleto) {
        if (cedula == null || cedula.trim().isEmpty()) return null;
        String cedulaLimpia = cedula.trim();

        return choferRepository.findByCedula(cedulaLimpia)
            .map(existente -> {
                if (nombreCompleto != null && !nombreCompleto.isBlank()
                        && !nombreCompleto.trim().equals(existente.getNombreCompleto())) {
                    existente.setNombreCompleto(nombreCompleto.trim());
                    return choferRepository.save(existente);
                }
                return existente;
            })
            .orElseGet(() -> {
                Chofer nuevo = new Chofer();
                nuevo.setTenantId(tenantId);
                nuevo.setCedula(cedulaLimpia);
                nuevo.setNombreCompleto(nombreCompleto != null ? nombreCompleto.trim() : "");
                return choferRepository.save(nuevo);
            });
    }

    public Optional<Chofer> buscarPorCedula(String cedula) {
        if (cedula == null || cedula.trim().isEmpty()) return Optional.empty();
        return choferRepository.findByCedula(cedula.trim());
    }
}
