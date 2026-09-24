package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaAnimalService;
import com.auroraplus.modules.ganaderia.services.GanaderiaIndicadoresService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** Bajas del hato: una muerte cuenta en la mortalidad; un robo (abigeato) sale del hato pero no. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaBajaAnimalTest {

    private static final AtomicLong TENANT = new AtomicLong(998_000);

    @Autowired private GanaderiaAnimalService animalService;
    @Autowired private GanaderiaIndicadoresService indicadoresService;
    @Autowired private AnimalRepository animalRepository;

    private Animal activo(Long tenant, String arete) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo("MACHO");
        a.setTipoAnimal("NOVILLO");
        a.setEstado("ACTIVO");
        return animalRepository.save(a);
    }

    @Test
    void muerteYRoboSacanDelHatoPeroSoloLaMuerteEsMortalidad() {
        Long t = TENANT.incrementAndGet();
        Animal muerto = activo(t, "B-1");
        Animal robado = activo(t, "B-2");
        activo(t, "B-3");
        activo(t, "B-4");

        animalService.registrarBaja(t, muerto.getId(), LocalDate.now().minusDays(3), "Mordedura de culebra", "Potrero La Vega");
        animalService.registrarBaja(t, robado.getId(), LocalDate.now().minusDays(1), GanaderiaAnimalService.CAUSA_ROBO, "Denuncia en el CICPC");

        assertEquals("MUERTO", animalRepository.findById(muerto.getId()).orElseThrow().getEstado());
        assertEquals("ROBADO", animalRepository.findById(robado.getId()).orElseThrow().getEstado());

        var ind = indicadoresService.calcular(t);
        assertEquals(1, ind.muertes12Meses, "el robo no es una muerte");
        // 1 muerte sobre 2 activos + 1 muerto = 33,3 %
        assertEquals(0, new java.math.BigDecimal("33.3").compareTo(ind.mortalidad12Meses));
    }

    @Test
    void noSeDaDeBajaDosVecesNiConFechaFutura() {
        Long t = TENANT.incrementAndGet();
        Animal a = activo(t, "B-9");
        assertThrows(RuntimeException.class, () -> animalService.registrarBaja(t, a.getId(), LocalDate.now().plusDays(1), "Enfermedad", null));
        assertThrows(RuntimeException.class, () -> animalService.registrarBaja(t, a.getId(), null, " ", null));

        animalService.registrarBaja(t, a.getId(), null, "Enfermedad", null);
        RuntimeException e = assertThrows(RuntimeException.class, () -> animalService.registrarBaja(t, a.getId(), null, "Enfermedad", null));
        assertTrue(e.getMessage().contains("ya no está activo"));
    }
}
