package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Vacuna;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.VacunaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** Una vacuna sin días de retiro no debe bloquear leche ni venta, ni generar alertas de retiro. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaRetiroSanitarioTest {

    private static final AtomicLong TENANT = new AtomicLong(990_000);

    @Autowired private GanaderiaSanidadService sanidadService;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private VacunaRepository vacunaRepository;

    private Animal vaca(Long tenant, String arete) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo("HEMBRA");
        a.setTipoAnimal("VACA");
        a.setEstado("ACTIVO");
        return animalRepository.save(a);
    }

    private Vacuna vacuna(Long tenant, String nombre, int retiroLeche, int retiroCarne) {
        Vacuna v = new Vacuna();
        v.setTenantId(tenant);
        v.setNombre(nombre);
        v.setDiasRetiroLeche(retiroLeche);
        v.setDiasRetiroCarne(retiroCarne);
        return vacunaRepository.save(v);
    }

    private long alertasRetiro(Long tenant) {
        return sanidadService.obtenerAlertasSanitarias(tenant).stream().filter(a -> a.tipo.startsWith("RETIRO_")).count();
    }

    @Test
    void vacunaSinRetiroAplicadaHoyNoBloqueaNiAlerta() {
        Long tenant = TENANT.incrementAndGet();
        Animal a = vaca(tenant, "R-1");
        Vacuna sinRetiro = vacuna(tenant, "Brucelosis RB51", 0, 0);

        sanidadService.aplicarVacuna(tenant, a.getId(), sinRetiro.getId(), LocalDate.now(), null, null, null);

        assertDoesNotThrow(() -> sanidadService.validarAptoParaTanqueOVentaLeche(a.getId()));
        assertDoesNotThrow(() -> sanidadService.validarAptoParaVentaConsumo(a.getId()));
        assertEquals(0, alertasRetiro(tenant));
    }

    @Test
    void vacunaConRetiroSigueBloqueandoHastaSuFechaInclusive() {
        Long tenant = TENANT.incrementAndGet();
        Animal a = vaca(tenant, "R-2");
        Vacuna conRetiro = vacuna(tenant, "Antibiótico X", 3, 21);

        sanidadService.aplicarVacuna(tenant, a.getId(), conRetiro.getId(), LocalDate.now().minusDays(3), null, null, null);

        // Aplicada hace 3 días con 3 días de retiro: hoy es el último día de retiro.
        assertThrows(IllegalStateException.class, () -> sanidadService.validarAptoParaTanqueOVentaLeche(a.getId()));
        assertThrows(RuntimeException.class, () -> sanidadService.validarAptoParaVentaConsumo(a.getId()));
        assertEquals(2, alertasRetiro(tenant));
    }
}
