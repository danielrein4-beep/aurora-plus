package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Aplicación de vacunas y medicamentos: calcula automáticamente las fechas de
 * fin de retiro sanitario (leche/carne) a partir del catálogo — sin esto el
 * sistema no puede avisar cuándo un animal vuelve a ser apto para venta o
 * consumo, que es sanitariamente obligatorio en la mayoría de países.
 */
@Service
public class GanaderiaSanidadService {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private VacunaRepository vacunaRepository;

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private MedicamentoRepository medicamentoRepository;

    @Autowired
    private AplicacionMedicamentoRepository aplicacionMedicamentoRepository;

    @Transactional
    public AplicacionVacuna aplicarVacuna(Long tenantId, Long animalId, Long vacunaId, LocalDate fechaAplicacion,
                                           String lote, String veterinarioResponsable, BigDecimal costo) {
        Animal animal = animalRepository.findById(animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        Vacuna vacuna = vacunaRepository.findById(vacunaId)
            .orElseThrow(() -> new RuntimeException("Vacuna no encontrada"));
        if (!vacuna.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Vacuna no pertenece a este tenant");
        }

        AplicacionVacuna aplicacion = new AplicacionVacuna();
        aplicacion.setTenantId(tenantId);
        aplicacion.setAnimal(animal);
        aplicacion.setVacuna(vacuna);
        aplicacion.setFechaAplicacion(fechaAplicacion);
        aplicacion.setLote(lote);
        aplicacion.setVeterinarioResponsable(veterinarioResponsable);
        aplicacion.setCosto(costo);
        aplicacion.setFechaFinRetiroLeche(fechaAplicacion.plusDays(vacuna.getDiasRetiroLeche()));
        aplicacion.setFechaFinRetiroCarne(fechaAplicacion.plusDays(vacuna.getDiasRetiroCarne()));
        if (vacuna.getDiasParaRefuerzo() != null && vacuna.getDiasParaRefuerzo() > 0) {
            aplicacion.setFechaProximaDosis(fechaAplicacion.plusDays(vacuna.getDiasParaRefuerzo()));
        }

        return aplicacionVacunaRepository.save(aplicacion);
    }

    @Transactional
    public AplicacionMedicamento aplicarMedicamento(Long tenantId, Long animalId, Long medicamentoId, LocalDate fechaAplicacion,
                                                      String dosis, String motivoDiagnostico, String veterinarioResponsable, BigDecimal costo) {
        Animal animal = animalRepository.findById(animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        Medicamento medicamento = medicamentoRepository.findById(medicamentoId)
            .orElseThrow(() -> new RuntimeException("Medicamento no encontrado"));
        if (!medicamento.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Medicamento no pertenece a este tenant");
        }

        AplicacionMedicamento aplicacion = new AplicacionMedicamento();
        aplicacion.setTenantId(tenantId);
        aplicacion.setAnimal(animal);
        aplicacion.setMedicamento(medicamento);
        aplicacion.setFechaAplicacion(fechaAplicacion);
        aplicacion.setDosis(dosis);
        aplicacion.setMotivoDiagnostico(motivoDiagnostico);
        aplicacion.setVeterinarioResponsable(veterinarioResponsable);
        aplicacion.setCosto(costo);
        aplicacion.setFechaFinRetiroLeche(fechaAplicacion.plusDays(medicamento.getDiasRetiroLeche()));
        aplicacion.setFechaFinRetiroCarne(fechaAplicacion.plusDays(medicamento.getDiasRetiroCarne()));

        return aplicacionMedicamentoRepository.save(aplicacion);
    }
}
