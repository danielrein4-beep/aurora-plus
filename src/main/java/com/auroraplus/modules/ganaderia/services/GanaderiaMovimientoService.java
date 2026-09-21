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
        Animal animal = animalRepository.findForUpdateByIdAndTenantId(animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new RuntimeException("No se puede trasladar un animal que no está activo");
        }

        Potrero destino = potreroRepository.findById(potreroDestinoId)
            .orElseThrow(() -> new RuntimeException("Potrero destino no encontrado"));
        if (!destino.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
        }
        if (!"ACTIVO".equals(destino.getEstado())) {
            throw new RuntimeException("No se puede mover ganado a '" + destino.getNombre()
                + "' porque está en descanso. Reactívelo mediante una rotación válida al cumplir su descanso mínimo");
        }

        Potrero origen = animal.getPotrero();
        if (origen != null && origen.getId().equals(destino.getId())) {
            throw new RuntimeException("El animal ya se encuentra en el potrero destino");
        }
        if (destino.getCapacidadAnimales() != null) {
            long ocupacionActual = animalRepository.findByPotreroIdAndEstadoAndTenantId(destino.getId(), "ACTIVO", tenantId).size();
            if (ocupacionActual >= destino.getCapacidadAnimales()) {
                throw new RuntimeException("El potrero destino '" + destino.getNombre() + "' ya alcanzó su capacidad de "
                    + destino.getCapacidadAnimales() + " animales");
            }
        }

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
