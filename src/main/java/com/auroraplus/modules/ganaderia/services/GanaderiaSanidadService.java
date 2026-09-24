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

    /** Alta de un producto en el catálogo de vacunas de la finca. */
    @Transactional
    public Vacuna crearVacuna(Long tenantId, Vacuna vacuna) {
        vacuna.setId(null);
        if (vacuna.getNombre() == null || vacuna.getNombre().isBlank()) {
            throw new IllegalArgumentException("La vacuna debe tener un nombre");
        }
        if (vacuna.getDiasRetiroLeche() == null || vacuna.getDiasRetiroLeche() < 0
                || vacuna.getDiasRetiroCarne() == null || vacuna.getDiasRetiroCarne() < 0) {
            throw new IllegalArgumentException("Los días de retiro no pueden ser negativos");
        }
        vacuna.setTenantId(tenantId);
        return vacunaRepository.save(vacuna);
    }

    /**
     * Vacunación de un lote: todo o nada. Antes, si fallaba un animal a mitad del lote los
     * anteriores quedaban vacunados aunque la pantalla mostrara error. Verifica que la vacuna y
     * cada animal sean de la finca (IDOR) y reparte el costo total entre los animales.
     */
    @Transactional
    public List<AplicacionVacuna> aplicarVacunaLote(Long tenantId, List<Long> animalIds, Long vacunaId, LocalDate fechaAplicacion,
                                                    String lote, String veterinarioResponsable, BigDecimal costoTotal) {
        if (animalIds == null || animalIds.isEmpty()) {
            throw new RuntimeException("Debe seleccionar al menos un animal para aplicar el tratamiento");
        }
        if (vacunaId == null) {
            throw new RuntimeException("Debe seleccionar una vacuna válida del catálogo");
        }
        Vacuna vacuna = vacunaRepository.findById(vacunaId)
            .orElseThrow(() -> new RuntimeException("Vacuna no encontrada en el catálogo"));
        if (vacuna.getTenantId() != null && !vacuna.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: La vacuna no pertenece a este tenant");
        }
        for (Long animalId : animalIds) {
            Animal animal = animalRepository.findById(animalId)
                .orElseThrow(() -> new RuntimeException("Animal con ID " + animalId + " no encontrado"));
            if (!animal.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: El animal arete " + animal.getArete()
                    + " (ID " + animalId + ") no pertenece al tenant actual");
            }
        }
        LocalDate fecha = fechaAplicacion != null ? fechaAplicacion : LocalDate.now();
        BigDecimal costoPorAnimal = costoTotal != null
            ? costoTotal.divide(BigDecimal.valueOf(animalIds.size()), 2, java.math.RoundingMode.HALF_UP)
            : null;
        List<AplicacionVacuna> resultado = new ArrayList<>();
        for (Long animalId : animalIds) {
            resultado.add(aplicarVacuna(tenantId, animalId, vacunaId, fecha, lote, veterinarioResponsable, costoPorAnimal));
        }
        return resultado;
    }

    @Transactional
    public AplicacionVacuna aplicarVacuna(Long tenantId, Long animalId, Long vacunaId, LocalDate fechaAplicacion,
                                           String lote, String veterinarioResponsable, BigDecimal costo) {
        if (animalId == null || vacunaId == null) {
            throw new IllegalArgumentException("Debe indicar animal y vacuna");
        }
        Animal animal = animalRepository.findForUpdateByIdAndTenantId(animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new IllegalStateException("No se puede vacunar un animal que no está activo");
        }
        Vacuna vacuna = vacunaRepository.findById(vacunaId)
            .orElseThrow(() -> new RuntimeException("Vacuna no encontrada"));
        if (!tenantId.equals(vacuna.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: Vacuna no pertenece a este tenant");
        }

        AplicacionVacuna aplicacion = new AplicacionVacuna();
        aplicacion.setTenantId(tenantId);
        aplicacion.setAnimal(animal);
        aplicacion.setVacuna(vacuna);
        LocalDate fechaEfectiva = fechaAplicacion != null ? fechaAplicacion : LocalDate.now();
        aplicacion.setFechaAplicacion(fechaEfectiva);
        aplicacion.setLote(lote);
        aplicacion.setVeterinarioResponsable(veterinarioResponsable);
        aplicacion.setCosto(costo);
        aplicacion.setFechaFinRetiroLeche(fechaEfectiva.plusDays(vacuna.getDiasRetiroLeche()));
        aplicacion.setFechaFinRetiroCarne(fechaEfectiva.plusDays(vacuna.getDiasRetiroCarne()));
        if (vacuna.getDiasParaRefuerzo() != null && vacuna.getDiasParaRefuerzo() > 0) {
            aplicacion.setFechaProximaDosis(fechaEfectiva.plusDays(vacuna.getDiasParaRefuerzo()));
        }

        return aplicacionVacunaRepository.save(aplicacion);
    }

    @Transactional
    public AplicacionMedicamento aplicarMedicamento(Long tenantId, Long animalId, Long medicamentoId, LocalDate fechaAplicacion,
                                                      String dosis, String motivoDiagnostico, String veterinarioResponsable, BigDecimal costo) {
        if (animalId == null || medicamentoId == null) {
            throw new IllegalArgumentException("Debe indicar animal y medicamento");
        }
        Animal animal = animalRepository.findForUpdateByIdAndTenantId(animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new IllegalStateException("No se puede medicar un animal que no está activo");
        }
        Medicamento medicamento = medicamentoRepository.findById(medicamentoId)
            .orElseThrow(() -> new RuntimeException("Medicamento no encontrado"));
        if (!tenantId.equals(medicamento.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: Medicamento no pertenece a este tenant");
        }

        AplicacionMedicamento aplicacion = new AplicacionMedicamento();
        aplicacion.setTenantId(tenantId);
        aplicacion.setAnimal(animal);
        aplicacion.setMedicamento(medicamento);
        LocalDate fechaEfectiva = fechaAplicacion != null ? fechaAplicacion : LocalDate.now();
        aplicacion.setFechaAplicacion(fechaEfectiva);
        aplicacion.setDosis(dosis);
        aplicacion.setMotivoDiagnostico(motivoDiagnostico);
        aplicacion.setVeterinarioResponsable(veterinarioResponsable);
        aplicacion.setCosto(costo);
        aplicacion.setFechaFinRetiroLeche(fechaEfectiva.plusDays(medicamento.getDiasRetiroLeche()));
        aplicacion.setFechaFinRetiroCarne(fechaEfectiva.plusDays(medicamento.getDiasRetiroCarne()));

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
            if (retiroActivo(a.getFechaFinRetiroCarne(), a.getFechaAplicacion(), hoy)) {
                throw new RuntimeException("No se puede vender " + a.getAnimal().getArete()
                    + ": en período de retiro de carne por " + a.getVacuna().getNombre() + " hasta " + a.getFechaFinRetiroCarne());
            }
        }
        for (AplicacionMedicamento a : aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId)) {
            if (retiroActivo(a.getFechaFinRetiroCarne(), a.getFechaAplicacion(), hoy)) {
                throw new RuntimeException("No se puede vender " + a.getAnimal().getArete()
                    + ": en período de retiro de carne por " + a.getMedicamento().getNombre() + " hasta " + a.getFechaFinRetiroCarne());
            }
        }
    }

    /**
     * La leche de un animal en período de retiro puede ordeñarse para su
     * bienestar, pero no puede entrar al tanque ni venderse. El único destino
     * permitido para ese registro es DESCARTE, para mantener producción y
     * trazabilidad sin contaminar el inventario comercial.
     */
    public void validarAptoParaTanqueOVentaLeche(Long animalId) {
        LocalDate hoy = LocalDate.now();
        for (AplicacionVacuna a : aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId)) {
            if (retiroActivo(a.getFechaFinRetiroLeche(), a.getFechaAplicacion(), hoy)) {
                throw new IllegalStateException("La leche de " + a.getAnimal().getArete()
                    + " está en retiro por " + a.getVacuna().getNombre() + " hasta " + a.getFechaFinRetiroLeche()
                    + ". Registre el ordeño con destino DESCARTE.");
            }
        }
        for (AplicacionMedicamento a : aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId)) {
            if (retiroActivo(a.getFechaFinRetiroLeche(), a.getFechaAplicacion(), hoy)) {
                throw new IllegalStateException("La leche de " + a.getAnimal().getArete()
                    + " está en retiro por " + a.getMedicamento().getNombre() + " hasta " + a.getFechaFinRetiroLeche()
                    + ". Registre el ordeño con destino DESCARTE.");
            }
        }
    }

    /**
     * Retiro vigente hasta su fecha de fin inclusive. Un producto con 0 días de
     * retiro deja el fin igual a la aplicación: eso NO es retiro (antes bloqueaba
     * todo ese día la leche al tanque y la venta del animal, y generaba alertas).
     */
    static boolean retiroActivo(LocalDate fin, LocalDate aplicacion, LocalDate hoy) {
        return fin != null && !fin.isBefore(hoy) && (aplicacion == null || fin.isAfter(aplicacion));
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
