package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    public static class AlertaSanitaria {
        public String tipo; // REFUERZO_VACUNA_PENDIENTE, RETIRO_LECHE_ACTIVO, RETIRO_CARNE_ACTIVO
        public Animal animal;
        public String producto; // nombre de la vacuna o medicamento involucrado
        public LocalDate fechaRelevante; // fecha del refuerzo, o fecha en que termina el retiro
        public String mensaje;
    }

    /**
     * Todas las alertas sanitarias vigentes del tenant en un solo lugar:
     * refuerzos de vacuna pendientes en los próximos 30 días, y animales que
     * TODAVÍA no son aptos para venta/consumo de leche o carne por estar en
     * período de retiro (de vacuna o medicamento).
     */
    public List<AlertaSanitaria> obtenerAlertasSanitarias(Long tenantId) {
        LocalDate hoy = LocalDate.now();
        List<AlertaSanitaria> alertas = new ArrayList<>();

        for (AplicacionVacuna a : aplicacionVacunaRepository.findRefuerzosPendientes(tenantId, hoy.minusDays(9999), hoy.plusDays(30))) {
            AlertaSanitaria alerta = new AlertaSanitaria();
            alerta.tipo = "REFUERZO_VACUNA_PENDIENTE";
            alerta.animal = a.getAnimal();
            alerta.producto = a.getVacuna().getNombre();
            alerta.fechaRelevante = a.getFechaProximaDosis();
            boolean vencido = a.getFechaProximaDosis().isBefore(hoy);
            alerta.mensaje = (vencido ? "VENCIDO: " : "") + "Refuerzo de " + a.getVacuna().getNombre()
                + " para " + a.getAnimal().getArete() + " el " + a.getFechaProximaDosis();
            alertas.add(alerta);
        }

        for (AplicacionVacuna a : aplicacionVacunaRepository.findConRetiroLecheActivo(tenantId, hoy)) {
            alertas.add(alertaRetiro("RETIRO_LECHE_ACTIVO", a.getAnimal(), a.getVacuna().getNombre(), a.getFechaFinRetiroLeche(), "leche"));
        }
        for (AplicacionVacuna a : aplicacionVacunaRepository.findConRetiroCarneActivo(tenantId, hoy)) {
            alertas.add(alertaRetiro("RETIRO_CARNE_ACTIVO", a.getAnimal(), a.getVacuna().getNombre(), a.getFechaFinRetiroCarne(), "carne"));
        }
        for (AplicacionMedicamento a : aplicacionMedicamentoRepository.findConRetiroLecheActivo(tenantId, hoy)) {
            alertas.add(alertaRetiro("RETIRO_LECHE_ACTIVO", a.getAnimal(), a.getMedicamento().getNombre(), a.getFechaFinRetiroLeche(), "leche"));
        }
        for (AplicacionMedicamento a : aplicacionMedicamentoRepository.findConRetiroCarneActivo(tenantId, hoy)) {
            alertas.add(alertaRetiro("RETIRO_CARNE_ACTIVO", a.getAnimal(), a.getMedicamento().getNombre(), a.getFechaFinRetiroCarne(), "carne"));
        }

        return alertas;
    }

    /**
     * Bloquea la venta si el animal todavía está en período de retiro de
     * carne (por vacuna o medicamento aplicado) — sin esto, un ganadero podía
     * vender y sacrificar un animal en pleno retiro sanitario sin ninguna
     * advertencia, un riesgo sanitario/legal real que las alertas por sí
     * solas (solo informativas) no evitaban.
     */
    public void validarAptoParaVentaConsumo(Long animalId) {
        LocalDate hoy = LocalDate.now();

        for (AplicacionVacuna a : aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId)) {
            if (a.getFechaFinRetiroCarne() != null && a.getFechaFinRetiroCarne().isAfter(hoy.minusDays(1))) {
                throw new RuntimeException("No se puede vender " + a.getAnimal().getArete()
                    + ": en período de retiro de carne por " + a.getVacuna().getNombre() + " hasta " + a.getFechaFinRetiroCarne());
            }
        }
        for (AplicacionMedicamento a : aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId)) {
            if (a.getFechaFinRetiroCarne() != null && a.getFechaFinRetiroCarne().isAfter(hoy.minusDays(1))) {
                throw new RuntimeException("No se puede vender " + a.getAnimal().getArete()
                    + ": en período de retiro de carne por " + a.getMedicamento().getNombre() + " hasta " + a.getFechaFinRetiroCarne());
            }
        }
    }

    private AlertaSanitaria alertaRetiro(String tipo, Animal animal, String producto, LocalDate fechaFin, String tipoRetiro) {
        AlertaSanitaria alerta = new AlertaSanitaria();
        alerta.tipo = tipo;
        alerta.animal = animal;
        alerta.producto = producto;
        alerta.fechaRelevante = fechaFin;
        alerta.mensaje = animal.getArete() + " no apto para venta/consumo de " + tipoRetiro + " hasta " + fechaFin
            + " (por " + producto + ")";
        return alerta;
    }
}
