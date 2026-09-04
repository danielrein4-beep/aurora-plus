package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Control reproductivo: servicio/monta, diagnóstico de preñez, parto — con creación automática de la cría al registrar un parto. */
@RestController
@RequestMapping("/api/ganaderia/reproduccion")
public class ReproduccionController {

    @Autowired
    private EventoReproductivoRepository eventoReproductivoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    public static class EventoRequest {
        public Long hembraId;
        public String tipo; // SERVICIO, DIAGNOSTICO_PRENEZ, PARTO
        public LocalDate fecha;
        public Long sementalId;
        public String sementalReferenciaExterna;
        public String resultado;
        public LocalDate fechaProbableParto;
        // Solo si tipo=PARTO: datos de la cría para crearla automáticamente
        public String areteCria;
        public String sexoCria;
        public BigDecimal pesoCria;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<EventoReproductivo> registrar(@RequestParam Long tenantId, @RequestBody EventoRequest request) {
        Animal hembra = animalRepository.findById(request.hembraId)
            .orElseThrow(() -> new RuntimeException("Hembra no encontrada"));
        if (!hembra.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (!"HEMBRA".equalsIgnoreCase(hembra.getSexo())) {
            throw new RuntimeException("El evento reproductivo debe registrarse sobre un animal hembra");
        }

        EventoReproductivo evento = new EventoReproductivo();
        evento.setTenantId(tenantId);
        evento.setHembra(hembra);
        evento.setTipo(request.tipo);
        evento.setFecha(request.fecha);
        evento.setResultado(request.resultado);
        evento.setFechaProbableParto(request.fechaProbableParto);
        evento.setSementalReferenciaExterna(request.sementalReferenciaExterna);

        if (request.sementalId != null) {
            Animal semental = animalRepository.findById(request.sementalId)
                .orElseThrow(() -> new RuntimeException("Semental no encontrado"));
            evento.setSemental(semental);
        }

        if ("PARTO".equals(request.tipo)) {
            if (request.areteCria == null || request.areteCria.isBlank()) {
                throw new RuntimeException("El arete de la cría es obligatorio al registrar un parto");
            }
            if (animalRepository.findByArete(request.areteCria).isPresent()) {
                throw new RuntimeException("Ya existe un animal con el arete: " + request.areteCria);
            }

            Animal cria = new Animal();
            cria.setTenantId(tenantId);
            cria.setArete(request.areteCria);
            cria.setEspecie(hembra.getEspecie());
            cria.setSexo(request.sexoCria);
            cria.setTipoAnimal("TERNERO".equals(request.sexoCria) ? "TERNERO" : "CRIA");
            cria.setFechaNacimiento(request.fecha);
            cria.setPesoActual(request.pesoCria);
            cria.setPotrero(hembra.getPotrero());
            cria.setMadre(hembra);
            cria.setEstado("ACTIVO");
            animalRepository.save(cria);

            evento.setCria(cria);
        }

        return ResponseEntity.ok(eventoReproductivoRepository.save(evento));
    }

    @GetMapping("/hembra/{hembraId}")
    public List<EventoReproductivo> historialHembra(@PathVariable Long hembraId) {
        return eventoReproductivoRepository.findByHembraIdOrderByFechaDesc(hembraId);
    }
}
