package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import com.auroraplus.core.auth.AuthContext;
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
        public String tipo; // SERVICIO, DIAGNOSTICO_PRENEZ, PARTO, CELO
        public LocalDate fecha;
        public Long sementalId;
        public String sementalReferenciaExterna;
        public String resultado;
        public LocalDate fechaProbableParto;
        // Solo si tipo=PARTO: datos de la cría para crearla automáticamente
        public String areteCria;
        public String sexoCria;
        public BigDecimal pesoCria;
        // Si tipo=CELO
        public String tipoCelo; // NATURAL, INDUCIDO_IATF
        public String sintomasCelo; // REFLEJO_INMOVILIDAD, MOCO_CRISTALINO, BRAMIDO
        public String horaOptimaIA; // sugerencia de inseminación AM/PM
    }

    @PostMapping
    @Transactional
    public ResponseEntity<EventoReproductivo> registrar(@RequestBody EventoRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        if (request.hembraId == null || request.tipo == null) throw new IllegalArgumentException("Debe indicar hembra y tipo de evento");
        if (!java.util.Set.of("SERVICIO", "DIAGNOSTICO_PRENEZ", "PARTO", "CELO").contains(request.tipo.toUpperCase())) {
            throw new IllegalArgumentException("Tipo de evento reproductivo no válido");
        }
        Animal hembra = animalRepository.findForUpdateByIdAndTenantId(request.hembraId, tenantId)
            .orElseThrow(() -> new RuntimeException("Hembra no encontrada"));
        if (!"HEMBRA".equalsIgnoreCase(hembra.getSexo())) {
            throw new RuntimeException("El evento reproductivo debe registrarse sobre un animal hembra");
        }

        EventoReproductivo evento = new EventoReproductivo();
        evento.setTenantId(tenantId);
        evento.setHembra(hembra);
        evento.setTipo(request.tipo);
        evento.setFecha(request.fecha != null ? request.fecha : LocalDate.now());
        evento.setResultado(request.resultado);
        evento.setFechaProbableParto(request.fechaProbableParto);
        evento.setSementalReferenciaExterna(request.sementalReferenciaExterna);

        if (request.sementalId != null) {
            Animal semental = animalRepository.findForUpdateByIdAndTenantId(request.sementalId, tenantId)
                .orElseThrow(() -> new RuntimeException("Semental no encontrado"));
            if (!"MACHO".equalsIgnoreCase(semental.getSexo()) || !"ACTIVO".equals(semental.getEstado())) {
                throw new RuntimeException("El semental seleccionado debe ser un macho activo");
            }
            evento.setSemental(semental);
        }

        if ("CELO".equalsIgnoreCase(request.tipo)) {
            String descCelo = (request.tipoCelo != null ? request.tipoCelo : "CELO NATURAL")
                + (request.sintomasCelo != null ? " (" + request.sintomasCelo + ")" : "")
                + (request.horaOptimaIA != null ? " - IA Óptima: " + request.horaOptimaIA : "");
            evento.setResultado(descCelo);
            hembra.setEstadoReproductivo("EN_ESPERA");
            animalRepository.save(hembra);
        } else if ("SERVICIO".equalsIgnoreCase(request.tipo)) {
            hembra.setEstadoReproductivo("EN_ESPERA");
            animalRepository.save(hembra);
        } else if ("DIAGNOSTICO_PRENEZ".equalsIgnoreCase(request.tipo)) {
            if (request.resultado != null) {
                String resUpper = request.resultado.toUpperCase();
                if (resUpper.contains("PREÑADA") || resUpper.contains("POSITIV")) {
                    hembra.setEstadoReproductivo("PREÑADA");
                    animalRepository.save(hembra);
                } else if (resUpper.contains("VACIA") || resUpper.contains("NEGATIV") || resUpper.contains("ABORTO")) {
                    hembra.setEstadoReproductivo("VACIA");
                    animalRepository.save(hembra);
                }
            }
        } else if ("PARTO".equalsIgnoreCase(request.tipo)) {
            if (request.areteCria == null || request.areteCria.isBlank()) {
                throw new RuntimeException("El arete de la cría es obligatorio al registrar un parto");
            }
            if (animalRepository.findByAreteAndTenantId(request.areteCria, tenantId).isPresent()) {
                throw new RuntimeException("Ya existe un animal con el arete: " + request.areteCria);
            }

            Animal cria = new Animal();
            cria.setTenantId(tenantId);
            cria.setArete(request.areteCria);
            cria.setEspecie(hembra.getEspecie());
            cria.setSexo(request.sexoCria);
            cria.setTipoAnimal("TERNERO".equalsIgnoreCase(request.sexoCria) ? "TERNERO" : "CRIA");
            cria.setFechaNacimiento(request.fecha != null ? request.fecha : LocalDate.now());
            cria.setPesoActual(request.pesoCria);
            cria.setPotrero(hembra.getPotrero());
            cria.setMadre(hembra);
            cria.setEstado("ACTIVO");
            cria.setEstadoReproductivo("VACIA");
            cria.setEstadoProductivo("CRIANDO");
            animalRepository.save(cria);

            evento.setCria(cria);

            hembra.setEstadoReproductivo("VACIA");
            hembra.setEstadoProductivo("CRIANDO");
            animalRepository.save(hembra);
        }

        return ResponseEntity.ok(eventoReproductivoRepository.save(evento));
    }

    @GetMapping("/hembra/{hembraId}")
    public List<EventoReproductivo> historialHembra(@PathVariable Long hembraId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(hembraId).filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Hembra no encontrada"));
        return eventoReproductivoRepository.findByHembraIdOrderByFechaDesc(hembraId);
    }
}
