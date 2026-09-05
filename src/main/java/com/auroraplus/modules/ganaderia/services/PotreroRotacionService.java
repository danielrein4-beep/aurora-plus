package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Manejo rotacional de potreros: mover el hato de un potrero a otro dejando
 * el de origen en descanso, respetando el orden de rotación configurado y
 * los días mínimos de descanso — sin esto, "rotar" era solo cambiar
 * manualmente el potrero de cada animal uno por uno, sin ninguna validación
 * de que el destino ya descansó lo suficiente o de que no se sobrecargue.
 */
@Service
public class PotreroRotacionService {

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private GanaderiaMovimientoService ganaderiaMovimientoService;

    /**
     * Mueve TODOS los animales activos del potrero de origen al de destino:
     * origen pasa a EN_DESCANSO, destino pasa a ACTIVO. Si se indica
     * animalIds, solo se mueven esos (útil para dividir el hato); si se omite,
     * se mueven todos los que están actualmente en el origen.
     */
    @Transactional
    public Map<String, Object> rotar(Long tenantId, Long potreroOrigenId, Long potreroDestinoId, List<Long> animalIds) {
        Potrero origen = obtenerPotreroDeTenant(tenantId, potreroOrigenId);
        Potrero destino = obtenerPotreroDeTenant(tenantId, potreroDestinoId);

        if (origen.getId().equals(destino.getId())) {
            throw new RuntimeException("El potrero de origen y destino no pueden ser el mismo");
        }

        if ("EN_DESCANSO".equals(destino.getEstado()) && !destino.isListoParaVolverAUso()) {
            throw new RuntimeException("El potrero destino '" + destino.getNombre() + "' todavía no cumple su descanso mínimo ("
                + destino.getDiasEnDescanso() + " de " + destino.getDiasDescansoMinimo() + " días)");
        }

        List<Animal> aMover = (animalIds == null || animalIds.isEmpty())
            ? animalRepository.findByPotreroIdAndEstado(origen.getId(), "ACTIVO")
            : animalIds.stream().map(id -> {
                Animal a = animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado: " + id));
                if (!a.getTenantId().equals(tenantId)) {
                    throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
                }
                if (a.getPotrero() == null || !a.getPotrero().getId().equals(origen.getId())) {
                    throw new RuntimeException("El animal " + a.getArete() + " no está actualmente en el potrero de origen");
                }
                return a;
            }).toList();

        if (aMover.isEmpty()) {
            throw new RuntimeException("No hay animales que mover desde '" + origen.getNombre() + "'");
        }

        if (destino.getCapacidadAnimales() != null) {
            long yaEnDestino = animalRepository.findByPotreroIdAndEstado(destino.getId(), "ACTIVO").size();
            if (yaEnDestino + aMover.size() > destino.getCapacidadAnimales()) {
                throw new RuntimeException("El potrero destino '" + destino.getNombre() + "' no tiene capacidad: "
                    + yaEnDestino + " actuales + " + aMover.size() + " a mover supera su capacidad de " + destino.getCapacidadAnimales());
            }
        }

        // Reusa el servicio de traslado individual para que cada animal quede con su rastro en
        // el kárdex de ubicación (MovimientoPotrero) — una rotación masiva no debe ser invisible
        // en el historial de cada animal, solo un "movimiento silencioso" de potrero.
        String motivo = "Rotación de potreros: " + origen.getNombre() + " → " + destino.getNombre();
        for (Animal a : aMover) {
            ganaderiaMovimientoService.moverAnimal(tenantId, a.getId(), destino.getId(), motivo);
        }

        origen.setEstado("EN_DESCANSO");
        origen.setFechaInicioDescanso(LocalDate.now());
        origen.setFechaInicioUso(null);
        potreroRepository.save(origen);

        destino.setEstado("ACTIVO");
        destino.setFechaInicioUso(LocalDate.now());
        destino.setFechaInicioDescanso(null);
        potreroRepository.save(destino);

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("potreroOrigen", origen);
        resultado.put("potreroDestino", destino);
        resultado.put("animalesMovidos", aMover.size());
        return resultado;
    }

    /**
     * Siguiente potrero en la secuencia de rotación después del actual, entre
     * los que ya están listos para recibir animales (ACTIVO con espacio libre,
     * o EN_DESCANSO que ya cumplió su mínimo). Cíclico: después del último
     * orden vuelve al primero.
     */
    public Potrero obtenerSiguienteEnRotacion(Long tenantId, Long potreroActualId) {
        Potrero actual = obtenerPotreroDeTenant(tenantId, potreroActualId);
        if (actual.getOrdenRotacion() == null) {
            throw new RuntimeException("El potrero '" + actual.getNombre() + "' no tiene ordenRotacion configurado");
        }

        List<Potrero> candidatos = potreroRepository.findAll().stream()
            .filter(p -> p.getTenantId().equals(tenantId))
            .filter(p -> p.getOrdenRotacion() != null)
            .filter(p -> !p.getId().equals(actual.getId()))
            .filter(p -> "ACTIVO".equals(p.getEstado()) || p.isListoParaVolverAUso())
            .sorted(Comparator.comparingInt(Potrero::getOrdenRotacion))
            .toList();

        if (candidatos.isEmpty()) {
            throw new RuntimeException("No hay ningún otro potrero disponible para rotar (todos en descanso sin cumplir el mínimo, o sin orden de rotación configurado)");
        }

        return candidatos.stream()
            .filter(p -> p.getOrdenRotacion() > actual.getOrdenRotacion())
            .findFirst()
            .orElse(candidatos.get(0)); // cíclico: si no hay uno más adelante, vuelve al primero de la lista
    }

    /** Asigna 1,2,3... según el orden de la lista de IDs recibida — forma rápida de fijar toda la secuencia de rotación de una vez. */
    @Transactional
    public List<Potrero> reordenar(Long tenantId, List<Long> potreroIdsEnOrden) {
        List<Potrero> actualizados = new ArrayList<>();
        int orden = 1;
        for (Long id : potreroIdsEnOrden) {
            Potrero p = obtenerPotreroDeTenant(tenantId, id);
            p.setOrdenRotacion(orden++);
            actualizados.add(potreroRepository.save(p));
        }
        return actualizados;
    }

    /** Sobrecarga (más animales de los que caben) y potreros en descanso que ya cumplieron su mínimo y podrían reactivarse. */
    public List<Map<String, Object>> obtenerAlertas(Long tenantId) {
        List<Map<String, Object>> alertas = new ArrayList<>();
        List<Potrero> potreros = potreroRepository.findAll().stream()
            .filter(p -> p.getTenantId().equals(tenantId))
            .toList();

        for (Potrero p : potreros) {
            long cantidadActual = animalRepository.findByPotreroIdAndEstado(p.getId(), "ACTIVO").size();

            if (p.getCapacidadAnimales() != null && cantidadActual > p.getCapacidadAnimales()) {
                alertas.add(alerta(p, "SOBRECARGA",
                    "Tiene " + cantidadActual + " animales, capacidad " + p.getCapacidadAnimales()));
            }
            if ("EN_DESCANSO".equals(p.getEstado()) && p.isListoParaVolverAUso()) {
                alertas.add(alerta(p, "DESCANSO_COMPLETO",
                    "Lleva " + p.getDiasEnDescanso() + " días en descanso — ya puede volver a uso"));
            }
        }
        return alertas;
    }

    private Map<String, Object> alerta(Potrero potrero, String tipo, String mensaje) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("potrero", potrero);
        a.put("tipo", tipo);
        a.put("mensaje", mensaje);
        return a;
    }

    private Potrero obtenerPotreroDeTenant(Long tenantId, Long potreroId) {
        Potrero p = potreroRepository.findById(potreroId)
            .orElseThrow(() -> new RuntimeException("Potrero no encontrado: " + potreroId));
        if (!p.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
        }
        return p;
    }
}
