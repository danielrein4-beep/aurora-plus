package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Vacuna;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** La vacunación por lote es todo o nada, y reparte el costo total entre los animales. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaVacunacionLoteTest {

    private static final AtomicLong TENANT = new AtomicLong(997_000);

    @Autowired private GanaderiaSanidadService sanidadService;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private AplicacionVacunaRepository aplicacionVacunaRepository;

    private Animal animal(Long tenant, String arete, String estado) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo("HEMBRA");
        a.setTipoAnimal("VACA");
        a.setEstado(estado);
        return animalRepository.save(a);
    }

    private Vacuna vacuna(Long tenant) {
        Vacuna v = new Vacuna();
        v.setNombre("Aftosa");
        v.setDiasRetiroLeche(0);
        v.setDiasRetiroCarne(0);
        return sanidadService.crearVacuna(tenant, v);
    }

    @Test
    void siUnAnimalDelLoteFallaNoQuedaNingunoVacunado() {
        Long t = TENANT.incrementAndGet();
        Animal sano = animal(t, "L-1", "ACTIVO");
        Animal muerto = animal(t, "L-2", "MUERTO");
        Vacuna v = vacuna(t);

        assertThrows(IllegalStateException.class, () ->
            sanidadService.aplicarVacunaLote(t, List.of(sano.getId(), muerto.getId()), v.getId(), LocalDate.now(), "B-1", "Dr. Pérez", null));

        assertTrue(aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(sano.getId()).isEmpty(),
            "el primer animal no debe quedar vacunado si el lote falló");
    }

    @Test
    void reparteElCostoTotalEntreLosAnimales() {
        Long t = TENANT.incrementAndGet();
        Animal a = animal(t, "R-1", "ACTIVO");
        Animal b = animal(t, "R-2", "ACTIVO");
        Vacuna v = vacuna(t);

        var aplicadas = sanidadService.aplicarVacunaLote(t, List.of(a.getId(), b.getId()), v.getId(), LocalDate.now(), "B-2", "Dr. Pérez", new BigDecimal("10.00"));

        assertEquals(2, aplicadas.size());
        aplicadas.forEach(ap -> assertEquals(0, new BigDecimal("5.00").compareTo(ap.getCosto())));
    }

    @Test
    void elCatalogoRechazaDiasDeRetiroNegativos() {
        Vacuna v = new Vacuna();
        v.setNombre("Mala");
        v.setDiasRetiroLeche(-1);
        v.setDiasRetiroCarne(0);
        assertThrows(IllegalArgumentException.class, () -> sanidadService.crearVacuna(TENANT.incrementAndGet(), v));
    }
}
