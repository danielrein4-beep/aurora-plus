package com.auroraplus.modules.minero.services;

import com.auroraplus.modules.minero.entities.TransformacionMineral;
import com.auroraplus.modules.minero.repositories.TransformacionMineralRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class TransformacionService {

    @Autowired
    private TransformacionMineralRepository transformacionMineralRepository;

    /**
     * Registra el resultado de clasificar un lote en zaranda, validando el balance de masa:
     * la suma de las salidas (grano + menudo + fino) no puede superar la entrada bruta.
     * La diferencia entre bruto y salidas se considera merma por impurezas.
     */
    public TransformacionMineral registrarTransformacion(Long tenantId, String loteOrigen, BigDecimal cantidadBruta,
                                                           BigDecimal cantidadGrano, BigDecimal cantidadMenudo,
                                                           BigDecimal cantidadFino, BigDecimal porcentajeCeniza) {

        BigDecimal totalSalidas = cantidadGrano.add(cantidadMenudo).add(cantidadFino);

        if (totalSalidas.compareTo(cantidadBruta) > 0) {
            throw new RuntimeException("Violación de balance de masa: la suma de salidas (" + totalSalidas
                + ") supera la cantidad bruta de entrada (" + cantidadBruta + ")");
        }

        BigDecimal mermaImpurezas = cantidadBruta.subtract(totalSalidas);

        TransformacionMineral transformacion = new TransformacionMineral();
        transformacion.setTenantId(tenantId);
        transformacion.setLoteOrigen(loteOrigen);
        transformacion.setCantidadBruta(cantidadBruta);
        transformacion.setCantidadGrano(cantidadGrano);
        transformacion.setCantidadMenudo(cantidadMenudo);
        transformacion.setCantidadFino(cantidadFino);
        transformacion.setPorcentajeCeniza(porcentajeCeniza);
        transformacion.setMermaImpurezas(mermaImpurezas);
        transformacion.setCantidadGranoDisponible(cantidadGrano);
        transformacion.setCantidadMenudoDisponible(cantidadMenudo);
        transformacion.setCantidadFinoDisponible(cantidadFino);
        transformacion.setFechaTransformacion(LocalDateTime.now());

        return transformacionMineralRepository.save(transformacion);
    }
}
