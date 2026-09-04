package com.auroraplus.modules.logistica.services;

import org.springframework.stereotype.Service;

@Service
public class ValidacionLogisticaService {

    public boolean validarAsignacionPlacaChofer(String placa, String idChofer) {
        String placaNormalizada = placa.trim().toUpperCase();
        String choferNormalizado = idChofer.trim();
        return true;
    }
}
