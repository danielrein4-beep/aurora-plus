package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.DetalleGuiaTraslado;
import com.auroraplus.modules.ganaderia.entities.GuiaTraslado;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.services.GuiaTrasladoPdfService;
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

/** La nota de movilización lleva los datos del viaje, los animales con su peso y el total. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaNotaMovilizacionTest {

    private static final AtomicLong TENANT = new AtomicLong(999_000);

    @Autowired private GuiaTrasladoPdfService pdfService;
    @Autowired private AnimalRepository animalRepository;

    private Animal animal(Long t, String arete, String peso) {
        Animal a = new Animal();
        a.setTenantId(t);
        a.setArete(arete);
        a.setSexo("MACHO");
        a.setTipoAnimal("TORO");
        a.setRaza("Brahman");
        a.setEstado("VENDIDO");
        a.setPesoActual(peso != null ? new BigDecimal(peso) : null);
        return animalRepository.save(a);
    }

    @Test
    void notaConDatosDelViajeAnimalesYPesoTotal() throws Exception {
        Long t = TENANT.incrementAndGet();
        GuiaTraslado g = new GuiaTraslado();
        g.setTenantId(t);
        g.setFecha(LocalDate.of(2026, 9, 24));
        g.setOrigen("Finca El Samán");
        g.setDestino("Matadero Industrial Centro");
        g.setMotivo("MATADERO");
        g.setTransportista("Transporte Pérez");
        g.setPlacaVehiculo("A12BC3D");
        for (Animal a : new Animal[]{animal(t, "T-1", "520"), animal(t, "T-2", "480.4")}) {
            DetalleGuiaTraslado d = new DetalleGuiaTraslado();
            d.setTenantId(t);
            d.setAnimal(a);
            g.addAnimal(d);
        }

        byte[] pdf = pdfService.generarGuiaPdf(g);
        String texto;
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            texto = new PDFTextStripper().getText(doc);
        }
        assertTrue(texto.contains("NOTA DE MOVILIZACIÓN DE GANADO"), texto);
        assertTrue(texto.contains("Pendiente de emitir"), "sin número de la guía oficial del INSAI todavía");
        assertTrue(texto.contains("Matadero Industrial Centro") && texto.contains("Matadero"));
        assertTrue(texto.contains("T-1") && texto.contains("T-2"));
        assertTrue(texto.contains("1.000 kg"), "peso total 520 + 480 redondeado\n" + texto);
        assertTrue(texto.contains("No sustituye la guía oficial"));
    }
}
