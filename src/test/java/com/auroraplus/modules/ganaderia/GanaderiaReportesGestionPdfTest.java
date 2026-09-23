package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import com.auroraplus.modules.ganaderia.entities.SociedadCeba;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroPesoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService.FilaImportacion;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService.ResultadoImportacion;
import com.auroraplus.modules.ganaderia.services.GanaderiaReportesGestionPdfService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.DatosSociedad;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** PDFs de gestión (hato, engorde, potreros, liquidación de sociedad) e importación con socio. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaReportesGestionPdfTest {

    private static final AtomicLong TENANT = new AtomicLong(997_000);

    @Autowired private GanaderiaReportesGestionPdfService reportes;
    @Autowired private GanaderiaSociedadCebaService sociedades;
    @Autowired private GanaderiaImportacionService importacion;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private PotreroRepository potreroRepository;
    @Autowired private RegistroPesoRepository registroPesoRepository;

    private static String texto(byte[] pdf) throws Exception {
        assertEquals("%PDF", new String(pdf, 0, 4));
        try (PDDocument d = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(d);
        }
    }

    private Potrero potrero(Long t, String nombre, String ha, Integer cap) {
        Potrero p = new Potrero();
        p.setTenantId(t);
        p.setNombre(nombre);
        p.setEstado("ACTIVO");
        p.setAreaHectareas(new BigDecimal(ha));
        p.setCapacidadAnimales(cap);
        p.setTipoPasto("Brachiaria");
        return potreroRepository.save(p);
    }

    private Animal animal(Long t, String arete, String tipo, String raza, String kg, Potrero pot) {
        Animal a = new Animal();
        a.setTenantId(t);
        a.setArete(arete);
        a.setSexo(tipo.equals("VACA") ? "HEMBRA" : "MACHO");
        a.setTipoAnimal(tipo);
        a.setRaza(raza);
        a.setEstado("ACTIVO");
        a.setPesoActual(new BigDecimal(kg));
        a.setPotrero(pot);
        return animalRepository.save(a);
    }

    private void pesaje(Long t, Animal a, LocalDate f, String kg) {
        RegistroPeso r = new RegistroPeso();
        r.setTenantId(t);
        r.setAnimal(a);
        r.setFecha(f);
        r.setPesoKg(new BigDecimal(kg));
        registroPesoRepository.save(r);
    }

    @Test
    void inventarioDelHatoAgrupaPorCategoriaRazaYPotrero() throws Exception {
        Long t = TENANT.incrementAndGet();
        Potrero grande = potrero(t, "Potrero Grande", "25", 50);
        animal(t, "V-1", "VACA", "Gyr", "450", grande);
        animal(t, "V-2", "VACA", "Gyr", "470", grande);
        animal(t, "T-1", "TORO", "Brahman", "750", null);

        String s = texto(reportes.inventarioHato(t));
        assertTrue(s.contains("INVENTARIO DEL HATO"), s);
        assertTrue(s.contains("Vaca") && s.contains("Toro"));
        assertTrue(s.contains("Gyr") && s.contains("Brahman"));
        assertTrue(s.contains("Potrero Grande") && s.contains("Sin potrero asignado"));
        assertTrue(s.contains("1.670 kg"), "peso vivo total 450+470+750\n" + s);
    }

    @Test
    void engordeListaEstancadosYCalculaGdp() throws Exception {
        Long t = TENANT.incrementAndGet();
        LocalDate d0 = LocalDate.of(2026, 6, 1);
        Animal bueno = animal(t, "N-1", "NOVILLO", "Brahman", "390", null);
        pesaje(t, bueno, d0, "300");
        pesaje(t, bueno, d0.plusDays(90), "390");                   // 1.000 kg/día
        Animal lento = animal(t, "N-2", "NOVILLO", "Brahman", "362", null);
        pesaje(t, lento, d0, "300");
        pesaje(t, lento, d0.plusDays(60), "360");
        pesaje(t, lento, d0.plusDays(90), "362");                  // último tramo 0.067

        String s = texto(reportes.engorde(t, null, null));
        assertTrue(s.contains("REPORTE DE ENGORDE"), s);
        assertTrue(s.contains("Animales estancados"));
        assertTrue(s.contains("1,000") && s.contains("0,067"), s);
    }

    @Test
    void potrerosMuestraOcupacionYCarga() throws Exception {
        Long t = TENANT.incrementAndGet();
        Potrero p = potrero(t, "La Vega", "10", 20);
        animal(t, "A-1", "NOVILLO", "Gyr", "300", p);
        animal(t, "A-2", "NOVILLO", "Gyr", "300", p);

        String s = texto(reportes.potreros(t));
        assertTrue(s.contains("REPORTE DE POTREROS"), s);
        assertTrue(s.contains("La Vega") && s.contains("Brachiaria"));
        assertTrue(s.contains("0,20 cab/ha"), "2 animales en 10 ha\n" + s);
        assertTrue(s.contains("2 / 20 (10%)"), s);
    }

    @Test
    void liquidacionDeSociedadConRepartoYFirmas() throws Exception {
        Long t = TENANT.incrementAndGet();
        DatosSociedad d = new DatosSociedad();
        d.nombreSocio = "Hacienda Los Mangos";
        d.documentoSocio = "J-40123456-7";
        d.porcentajeFinca = new BigDecimal("50");
        SociedadCeba s = sociedades.crear(t, d);
        Animal a = animal(t, "S-1", "NOVILLO", "Gyr", "300", null);
        sociedades.asignarAnimales(t, s.getId(), List.of(a.getId()), LocalDate.now().minusDays(100));
        Animal x = animalRepository.findById(a.getId()).orElseThrow();
        x.setPesoActual(new BigDecimal("400"));
        animalRepository.save(x);

        String txt = texto(reportes.liquidacionSociedad(t, s.getId()));
        assertTrue(txt.contains("LIQUIDACIÓN DE CEBA EN SOCIEDAD"), txt);
        assertTrue(txt.contains("Hacienda Los Mangos") && txt.contains("J-40123456-7"));
        assertTrue(txt.contains("+100,0 kg"), "ganó 100 kg\n" + txt);
        assertTrue(txt.contains("350,0 kg"), "total socio = 300 entrada + 50\n" + txt);
        assertTrue(txt.contains("Por la finca"));
    }

    @Test
    void importacionIngresaAnimalesALaSociedadDelSocio() {
        Long t = TENANT.incrementAndGet();
        DatosSociedad d = new DatosSociedad();
        d.nombreSocio = "Pedro Pérez";
        d.porcentajeFinca = new BigDecimal("60");
        SociedadCeba s = sociedades.crear(t, d);

        FilaImportacion ok = new FilaImportacion();
        ok.arete = "P-1"; ok.sexo = "MACHO"; ok.tipoAnimal = "NOVILLO"; ok.pesoActual = "280";
        ok.socio = "pedro pérez"; ok.fechaEntradaSociedad = "01/07/2026";
        FilaImportacion propio = new FilaImportacion();
        propio.arete = "P-2"; propio.sexo = "MACHO"; propio.pesoActual = "300";

        ResultadoImportacion r = importacion.importar(t, List.of(ok, propio), true);
        assertTrue(r.errores.isEmpty(), () -> "errores: " + r.errores.stream().map(e -> e.mensaje).toList());
        assertEquals(1, r.animalesEnSociedad);

        Animal p1 = animalRepository.findByTenantId(t).stream().filter(a -> a.getArete().equals("P-1")).findFirst().orElseThrow();
        assertEquals(s.getId(), p1.getSociedadCebaId());
        assertEquals(0, new BigDecimal("280").compareTo(p1.getPesoEntradaSociedad()));
        assertEquals(LocalDate.of(2026, 7, 1), p1.getFechaEntradaSociedad());
        Animal p2 = animalRepository.findByTenantId(t).stream().filter(a -> a.getArete().equals("P-2")).findFirst().orElseThrow();
        assertNull(p2.getSociedadCebaId(), "sin socio queda como propio");
    }

    @Test
    void importacionRechazaSocioInexistenteOSinPeso() {
        Long t = TENANT.incrementAndGet();
        DatosSociedad d = new DatosSociedad();
        d.nombreSocio = "Pedro Pérez";
        d.porcentajeFinca = new BigDecimal("50");
        sociedades.crear(t, d);

        FilaImportacion noExiste = new FilaImportacion();
        noExiste.arete = "Q-1"; noExiste.sexo = "MACHO"; noExiste.pesoActual = "300"; noExiste.socio = "Juan Nadie";
        FilaImportacion sinPeso = new FilaImportacion();
        sinPeso.arete = "Q-2"; sinPeso.sexo = "MACHO"; sinPeso.socio = "Pedro Pérez";

        ResultadoImportacion r = importacion.importar(t, List.of(noExiste, sinPeso), true);
        assertFalse(r.confirmado);
        assertEquals(List.of("socio", "pesoActual"), r.errores.stream().map(e -> e.campo).toList());
        assertTrue(animalRepository.findByTenantId(t).isEmpty());
    }
}
