package com.auroraplus.modules.minero.services;

import com.auroraplus.modules.minero.entities.NominaDestajo;
import com.auroraplus.modules.minero.repositories.NominaDestajoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
public class NominaService {

    @Autowired
    private NominaDestajoRepository nominaDestajoRepository;

    public NominaDestajo calcularYRegistrarDestajo(Long tenantId, String nombrePicador, BigDecimal toneladasProducidas, BigDecimal tarifaPorTonelada) {
        // Cálculo matemático exacto: Toneladas * Tarifa
        BigDecimal totalPagar = toneladasProducidas.multiply(tarifaPorTonelada).setScale(2, RoundingMode.HALF_UP);

        NominaDestajo nomina = new NominaDestajo();
        nomina.setTenantId(tenantId);
        nomina.setNombrePicador(nombrePicador);
        nomina.setToneladasProducidas(toneladasProducidas);
        nomina.setTarifaPorTonelada(tarifaPorTonelada);
        nomina.setTotalPagar(totalPagar);
        nomina.setFechaLiquidacion(LocalDateTime.now());

        return nominaDestajoRepository.save(nomina);
    }
}
