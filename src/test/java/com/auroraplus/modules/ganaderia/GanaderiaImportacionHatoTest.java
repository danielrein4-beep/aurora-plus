package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService.FilaImportacion;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService.PrenezActual;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService.ResultadoImportacion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Carga inicial del hato (migración desde Excel) y desglose de preñez por padrote. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaImportacionHatoTest {

    private static final AtomicLong TENANT = new AtomicLong(970_000);

    @Autowired private GanaderiaImportacionService importacionService;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private PotreroRepository potreroRepository;

    private static FilaImportacion fila(String arete, String sexo, String tipo, String raza) {
        FilaImportacion f = new FilaImportacion();
        f.arete = arete;
        f.sexo = sexo;
        f.tipoAnimal = tipo;
        f.raza = raza;
        return f;
    }

    private Potrero potrero(Long tenantId, String nombre) {
        Potrero p = new Potrero();
        p.setTenantId(tenantId);
        p.setNombre(nombre);
        p.setEstado("OCUPADO");
        return potreroRepository.save(p);
    }

    @Test
    void vistaPreviaNoGuardaNadaYResumePorTipoYRaza() {
        Long tenant = TENANT.incrementAndGet();
        List<FilaImportacion> filas = List.of(
            fila("T-1", "M", "toro", "Brahman"),
            fila("V-1", "hembra", "VACA", "Gyr"),
            fila("V-2", "H", "VACA", "Gyr"));

        ResultadoImportacion r = importacionService.importar(tenant, filas, false);

        assertTrue(r.errores.isEmpty(), () -> "errores inesperados: " + r.errores.stream().map(e -> e.mensaje).toList());
        assertFalse(r.confirmado);
        assertEquals(Map.of("TORO", 1, "VACA", 2), r.porTipo);
        assertEquals(2, r.porRaza.get("Gyr"));
        assertTrue(animalRepository.findByTenantId(tenant).isEmpty(), "la vista previa no debe guardar animales");
    }

    @Test
    void unaFilaConErrorBloqueaTodaLaImportacion() {
        Long tenant = TENANT.incrementAndGet();
        FilaImportacion sinSexo = fila("X-2", null, null, null);
        FilaImportacion potreroInexistente = fila("X-3", "HEMBRA", "VACA", null);
        potreroInexistente.potrero = "La Lomita";
        FilaImportacion toroPrenado = fila("X-4", "MACHO", "TORO", null);
        toroPrenado.estadoReproductivo = "preñada";

        ResultadoImportacion r = importacionService.importar(tenant, List.of(
            fila("X-1", "HEMBRA", "VACA", null), sinSexo, potreroInexistente, toroPrenado,
            fila("X-1", "HEMBRA", "VACA", null)), true);

        assertFalse(r.confirmado);
        List<Integer> filasConError = r.errores.stream().map(e -> e.fila).distinct().toList();
        assertEquals(List.of(3, 4, 5, 6), filasConError, "fila de Excel = índice + 2 (encabezado)");
        assertTrue(animalRepository.findByTenantId(tenant).isEmpty(), "todo o nada: no debe quedar medio hato cargado");
    }

    @Test
    void importaHatoConMadresPotreroYPrenezPorPadrote() {
        Long tenant = TENANT.incrementAndGet();
        potrero(tenant, "Potrero Grande");

        FilaImportacion toro = fila("T-10", "MACHO", "TORO", "Brahman");
        toro.nombre = "Lucero";
        FilaImportacion vaca1 = fila("V-10", "HEMBRA", "VACA", "Gyr");
        vaca1.potrero = "potrero grande";
        vaca1.estadoReproductivo = "PREÑADA";
        vaca1.padrotePrenez = "T-10";
        vaca1.fechaProbableParto = "15/12/2026";
        FilaImportacion vaca2 = fila("V-11", "HEMBRA", "VACA", "Gyr");
        vaca2.estadoReproductivo = "prenada";
        vaca2.padrotePrenez = "Pajuela Holstein 4521";
        FilaImportacion vaca3 = fila("V-12", "HEMBRA", "VACA", "Gyr");
        vaca3.estadoReproductivo = "PREÑADA";
        // La cría viene ANTES que su madre en el archivo: el orden no debe importar.
        FilaImportacion cria = fila("B-10", "MACHO", null, "Gyr");
        cria.areteMadre = "V-10";
        cria.aretePadre = "T-10";
        cria.fechaNacimiento = java.time.LocalDate.now().minusMonths(4).toString();

        ResultadoImportacion r = importacionService.importar(tenant, List.of(cria, toro, vaca1, vaca2, vaca3), true);

        assertTrue(r.errores.isEmpty(), () -> "errores inesperados: " + r.errores.stream().map(e -> e.mensaje).toList());
        assertTrue(r.confirmado);
        assertEquals(5, r.animalesImportados);
        assertEquals(3, r.preneces);

        Map<String, Animal> hato = animalRepository.findByTenantId(tenant).stream()
            .collect(Collectors.toMap(Animal::getArete, a -> a));
        assertEquals("TERNERO", hato.get("B-10").getTipoAnimal(), "sin tipo se sugiere por sexo y edad");
        assertEquals(hato.get("V-10").getId(), hato.get("B-10").getMadre().getId());
        assertEquals(hato.get("T-10").getId(), hato.get("B-10").getPadre().getId());
        assertEquals("Potrero Grande", hato.get("V-10").getPotrero().getNombre());
        assertNull(hato.get("V-10").getCostoAdquisicion(), "carga inicial no inventa costos");

        Map<Long, PrenezActual> prenez = importacionService.prenezActual(tenant).stream()
            .collect(Collectors.toMap(p -> p.hembraId, p -> p));
        assertEquals(3, prenez.size());
        assertEquals("Lucero (T-10)", prenez.get(hato.get("V-10").getId()).padrote);
        assertEquals(hato.get("T-10").getId(), prenez.get(hato.get("V-10").getId()).sementalId);
        assertEquals(java.time.LocalDate.of(2026, 12, 15), prenez.get(hato.get("V-10").getId()).fechaProbableParto);
        assertEquals("Pajuela Holstein 4521", prenez.get(hato.get("V-11").getId()).padrote);
        assertNull(prenez.get(hato.get("V-12").getId()).padrote);

        // Reimportar el mismo archivo no duplica: los aretes ya existen.
        ResultadoImportacion otraVez = importacionService.importar(tenant, List.of(fila("T-10", "MACHO", "TORO", null)), true);
        assertFalse(otraVez.confirmado);
        assertEquals(5, animalRepository.findByTenantId(tenant).size());
    }

    @Test
    void elMismoAretePuedeExistirEnFincasDistintas() {
        Long fincaA = TENANT.incrementAndGet();
        Long fincaB = TENANT.incrementAndGet();

        assertTrue(importacionService.importar(fincaA, List.of(fila("001", "HEMBRA", "VACA", null)), true).confirmado);
        ResultadoImportacion b = importacionService.importar(fincaB, List.of(fila("001", "HEMBRA", "VACA", null)), true);

        assertTrue(b.errores.isEmpty(), () -> "errores inesperados: " + b.errores.stream().map(e -> e.mensaje).toList());
        assertTrue(b.confirmado, "otra finca no debe chocar con el arete 001 de la primera");
    }
}
