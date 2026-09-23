package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroPesoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Control de engorde del hato: GDP (ganancia diaria de peso) de todos los animales
 * activos de una vez, y corrección de pesajes mal digitados. El peso "actual" del
 * animal siempre queda igual al de su pesaje más reciente.
 */
@Service
public class GanaderiaEngordeService {

    @Autowired
    private RegistroPesoRepository registroPesoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    public static class FilaEngorde {
        public Long animalId;
        public String arete;
        public String nombre;
        public String tipoAnimal;
        public String raza;
        public String sexo;
        public String lote;
        public Long potreroId;
        public String potrero;
        public int cantidadPesajes;
        public BigDecimal pesoInicial;
        public LocalDate fechaInicial;
        public BigDecimal pesoUltimo;
        public LocalDate fechaUltimo;
        public Long dias;
        public BigDecimal gananciaTotalKg;
        /** Promedio entre el primer y el último pesaje. Null con menos de 2 pesajes o 0 días. */
        public BigDecimal gdpKgDia;
        /** Entre los dos últimos pesajes: muestra si el animal se estancó recientemente. */
        public BigDecimal gdpUltimoPeriodoKgDia;
    }

    @Transactional(readOnly = true)
    public List<FilaEngorde> resumen(Long tenantId) {
        Map<Long, List<RegistroPeso>> porAnimal = new HashMap<>();
        for (RegistroPeso r : registroPesoRepository.findByTenantIdOrdenado(tenantId)) {
            porAnimal.computeIfAbsent(r.getAnimal().getId(), k -> new ArrayList<>()).add(r);
        }
        List<FilaEngorde> filas = new ArrayList<>();
        for (Animal a : animalRepository.findByTenantIdAndEstado(tenantId, "ACTIVO")) {
            FilaEngorde f = new FilaEngorde();
            f.animalId = a.getId();
            f.arete = a.getArete();
            f.nombre = a.getNombre();
            f.tipoAnimal = a.getTipoAnimal();
            f.raza = a.getRaza();
            f.sexo = a.getSexo();
            f.lote = a.getLote();
            if (a.getPotrero() != null) {
                f.potreroId = a.getPotrero().getId();
                f.potrero = a.getPotrero().getNombre();
            }
            List<RegistroPeso> h = porAnimal.getOrDefault(a.getId(), List.of());
            f.cantidadPesajes = h.size();
            if (!h.isEmpty()) {
                RegistroPeso primero = h.get(0);
                RegistroPeso ultimo = h.get(h.size() - 1);
                f.pesoInicial = primero.getPesoKg();
                f.fechaInicial = primero.getFecha();
                f.pesoUltimo = ultimo.getPesoKg();
                f.fechaUltimo = ultimo.getFecha();
                if (h.size() >= 2) {
                    f.dias = ChronoUnit.DAYS.between(primero.getFecha(), ultimo.getFecha());
                    f.gananciaTotalKg = ultimo.getPesoKg().subtract(primero.getPesoKg());
                    f.gdpKgDia = gdp(primero, ultimo);
                    f.gdpUltimoPeriodoKgDia = gdp(h.get(h.size() - 2), ultimo);
                }
            } else if (a.getPesoActual() != null) {
                // Sin pesajes registrados: solo el peso de la ficha, sin GDP.
                f.pesoUltimo = a.getPesoActual();
            }
            filas.add(f);
        }
        filas.sort(Comparator.comparing((FilaEngorde f) -> f.arete, Comparator.nullsLast(String::compareTo)));
        return filas;
    }

    @Transactional
    public RegistroPeso editar(Long tenantId, Long registroId, LocalDate fecha, BigDecimal pesoKg) {
        RegistroPeso r = buscar(tenantId, registroId);
        if (pesoKg != null) {
            if (pesoKg.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("El peso debe ser mayor a cero");
            r.setPesoKg(pesoKg);
        }
        if (fecha != null) {
            if (fecha.isAfter(LocalDate.now())) throw new IllegalArgumentException("La fecha del pesaje no puede estar en el futuro");
            r.setFecha(fecha);
        }
        registroPesoRepository.save(r);
        resincronizarPesoActual(r.getAnimal());
        return r;
    }

    @Transactional
    public void eliminar(Long tenantId, Long registroId) {
        RegistroPeso r = buscar(tenantId, registroId);
        Animal animal = r.getAnimal();
        registroPesoRepository.delete(r);
        registroPesoRepository.flush();
        resincronizarPesoActual(animal);
    }

    private RegistroPeso buscar(Long tenantId, Long registroId) {
        return registroPesoRepository.findById(registroId)
            .filter(r -> tenantId.equals(r.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Pesaje no encontrado"));
    }

    /** El peso de la ficha es el del pesaje más reciente; si ya no quedan pesajes se deja como estaba. */
    private void resincronizarPesoActual(Animal animal) {
        List<RegistroPeso> h = registroPesoRepository.findByAnimalIdOrderByFechaAsc(animal.getId());
        if (!h.isEmpty()) {
            animal.setPesoActual(h.get(h.size() - 1).getPesoKg());
            animalRepository.save(animal);
        }
    }

    private static BigDecimal gdp(RegistroPeso desde, RegistroPeso hasta) {
        long dias = ChronoUnit.DAYS.between(desde.getFecha(), hasta.getFecha());
        if (dias <= 0) return null;
        return hasta.getPesoKg().subtract(desde.getPesoKg()).divide(BigDecimal.valueOf(dias), 3, RoundingMode.HALF_UP);
    }
}
