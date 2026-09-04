package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.MovimientoPotrero;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoPotreroRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Traslado de un animal entre potreros: actualiza su ubicación actual y deja rastro en el kárdex de ubicación. */
@Service
public class GanaderiaMovimientoService {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private MovimientoPotreroRepository movimientoPotreroRepository;

    @Transactional
    public MovimientoPotrero moverAnimal(Long tenantId, Long animalId, Long potreroDestinoId, String motivo) {
        Animal animal = animalRepository.findById(animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new RuntimeException("No se puede trasladar un animal que no está activo");
        }

        Potrero destino = potreroRepository.findById(potreroDestinoId)
            .orElseThrow(() -> new RuntimeException("Potrero destino no encontrado"));
        if (!destino.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
        }

        Potrero origen = animal.getPotrero();

        MovimientoPotrero movimiento = new MovimientoPotrero();
        movimiento.setTenantId(tenantId);
        movimiento.setAnimal(animal);
        movimiento.setPotreroOrigen(origen);
        movimiento.setPotreroDestino(destino);
        movimiento.setMotivo(motivo);

        animal.setPotrero(destino);
        animalRepository.save(animal);

        return movimientoPotreroRepository.save(movimiento);
    }
}
