package com.auroraplus.modules.logistica.services;

import com.auroraplus.modules.logistica.entities.RutaTransporte;
import com.auroraplus.modules.logistica.repositories.RutaTransporteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class LogisticaService {

    @Autowired
    private RutaTransporteRepository rutaTransporteRepository;

    public RutaTransporte registrarFlete(Long tenantId, String origen, String destino, String placaVehiculo, BigDecimal costoFlete) {
        validarCostoFlete(costoFlete);

        RutaTransporte ruta = new RutaTransporte();
        ruta.setTenantId(tenantId);
        ruta.setOrigen(origen);
        ruta.setDestino(destino);
        ruta.setPlacaVehiculo(placaVehiculo.trim().toUpperCase());
        ruta.setCostoFlete(costoFlete);
        ruta.setFechaDespacho(LocalDateTime.now());

        return rutaTransporteRepository.save(ruta);
    }

    private void validarCostoFlete(BigDecimal costoFlete) {
        if (costoFlete == null || costoFlete.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El costo de flete debe ser un monto positivo");
        }
    }
}
