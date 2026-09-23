package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.entities.Vacuna;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import com.auroraplus.modules.ganaderia.repositories.VacunaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaReportesPdfService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** Reportes PDF de ordeño (diario/semanal) y constancia de vacunación. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaReportesPdfTest {

    private static final AtomicLong TENANT = new AtomicLong(980_000);

    @Autowired private GanaderiaReportesPdfService reportesPdfService;
    @Autowired private GanaderiaSanidadService sanidadService;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private RegistroOrdenoRepository registroOrdenoRepository;
    @Autowired private VacunaRepository vacunaRepository;

    private Animal vaca(Long tenant, String arete, String nombre) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setNombre(nombre);
        a.setSexo("HEMBRA");
        a.setTipoAnimal("VACA");
        a.setEstado("ACTIVO");
        return animalRepository.save(a);
    }

    private void ordeno(Long tenant, Animal a, LocalDate fecha, String turno, String litros) {
        RegistroOrdeno r = new RegistroOrdeno();
        r.setTenantId(tenant);
        r.setAnimal(a);
        r.setFecha(fecha);
        r.setTurno(turno);
        r.setCantidadLitros(new BigDecimal(litros));
        registroOrdenoRepository.save(r);
    }

    private static String texto(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private static int paginas(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return doc.getNumberOfPages();
        }
    }

    @Test
    void ordenoSemanalSumaTurnosYPaginaConHatoGrande() throws Exception {
        Long tenant = TENANT.incrementAndGet();
        LocalDate lunes = LocalDate.of(2026, 9, 14);
        Animal mariposa = vaca(tenant, "V-001", "Mariposa");
        for (int d = 0; d < 7; d++) {
            ordeno(tenant, mariposa, lunes.plusDays(d), "MAÑANA", "8.5");
            ordeno(tenant, mariposa, lunes.plusDays(d), "TARDE", "6");
        }
        // 80 vacas más para forzar varias páginas en la tabla por vaca
        for (int i = 2; i <= 81; i++) {
            ordeno(tenant, vaca(tenant, String.format("V-%03d", i), null), lunes, "MANANA", "10");
        }

        byte[] pdf = reportesPdfService.reporteOrdeno(tenant, lunes, lunes.plusDays(6));
        String t = texto(pdf);

        assertTrue(t.contains("REPORTE DE ORDEÑO SEMANAL"), t);
        assertTrue(t.contains("901.5 L"), "7 × (8.5 + 6) + 80 × 10 = 901.5 L\n" + t);
        assertTrue(t.contains("Mariposa"));
        assertTrue(paginas(pdf) >= 2, "81 vacas no caben en una página");
        assertTrue(t.contains("Página 1 de " + paginas(pdf)));
    }

    @Test
    void ordenoDiarioSinRegistrosNoFalla() throws Exception {
        Long tenant = TENANT.incrementAndGet();
        String t = texto(reportesPdfService.reporteOrdeno(tenant, LocalDate.of(2026, 9, 20), LocalDate.of(2026, 9, 20)));
        assertTrue(t.contains("REPORTE DE ORDEÑO DIARIO"));
        assertTrue(t.contains("No hay ordeños registrados"));
    }

    @Test
    void ordenoRechazaRangosInvalidos() {
        Long tenant = TENANT.incrementAndGet();
        LocalDate hoy = LocalDate.of(2026, 9, 20);
        assertThrows(IllegalArgumentException.class, () -> reportesPdfService.reporteOrdeno(tenant, hoy, hoy.minusDays(1)));
        assertThrows(IllegalArgumentException.class, () -> reportesPdfService.reporteOrdeno(tenant, hoy.minusDays(200), hoy));
    }

    @Test
    void constanciaDeVacunacionListaAnimalesVacunaYProximaDosis() throws Exception {
        Long tenant = TENANT.incrementAndGet();
        Vacuna aftosa = new Vacuna();
        aftosa.setTenantId(tenant);
        aftosa.setNombre("Aftosa Bivalente");
        aftosa.setEnfermedadPrevenida("Fiebre aftosa");
        aftosa.setDiasParaRefuerzo(180);
        aftosa = vacunaRepository.save(aftosa);

        LocalDate jornada = LocalDate.of(2026, 9, 15);
        Animal a1 = vaca(tenant, "V-100", "Lucera");
        Animal a2 = vaca(tenant, "V-101", "Canela");
        vaca(tenant, "V-102", "NoVacunada");
        sanidadService.aplicarVacuna(tenant, a1.getId(), aftosa.getId(), jornada, "LOT-778", "Dr. Pérez", null);
        sanidadService.aplicarVacuna(tenant, a2.getId(), aftosa.getId(), jornada, "LOT-778", "Dr. Pérez", null);

        String t = texto(reportesPdfService.constanciaVacunacion(tenant, jornada, jornada, null));

        assertTrue(t.contains("CONSTANCIA DE VACUNACIÓN"), t);
        assertTrue(t.contains("Aftosa Bivalente"));
        assertTrue(t.contains("V-100") && t.contains("V-101"));
        assertFalse(t.contains("V-102"), "solo los vacunados en la jornada");
        assertTrue(t.contains("LOT-778"));
        assertTrue(t.contains("Dr. Pérez"));
        assertTrue(t.contains(jornada.plusDays(180).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))),
            "próxima dosis = aplicación + días para refuerzo\n" + t);
    }

    @Test
    void constanciaNoMezclaFincas() throws Exception {
        Long fincaA = TENANT.incrementAndGet();
        Long fincaB = TENANT.incrementAndGet();
        Vacuna v = new Vacuna();
        v.setTenantId(fincaA);
        v.setNombre("Rabia");
        v = vacunaRepository.save(v);
        LocalDate hoy = LocalDate.of(2026, 9, 16);
        sanidadService.aplicarVacuna(fincaA, vaca(fincaA, "A-1", null).getId(), v.getId(), hoy, null, null, null);

        String t = texto(reportesPdfService.constanciaVacunacion(fincaB, hoy, hoy, null));
        assertFalse(t.contains("A-1"));
        assertTrue(t.contains("No hay vacunas aplicadas"));
    }
}
