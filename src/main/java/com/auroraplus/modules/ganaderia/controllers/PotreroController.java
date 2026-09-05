package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import com.auroraplus.modules.ganaderia.services.PotreroRotacionService;
import com.auroraplus.modules.ganaderia.services.ReferenciaPastoreoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ganaderia/potreros")
public class PotreroController {

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PotreroRotacionService potreroRotacionService;

    @Autowired
    private ReferenciaPastoreoService referenciaPastoreoService;

    @GetMapping
    public List<Potrero> listar() {
        return potreroRepository.findAll();
    }

    public static class PosicionRequest {
        public Integer posX;
        public Integer posY;
        public Integer ancho;
        public Integer alto;
        public String forma;
    }

    /**
     * Mapeo visual OPCIONAL del potrero en un plano de la finca — solo para
     * el ganadero que quiera verlo; la rotación y las alertas funcionan
     * exactamente igual sin llamar nunca este endpoint. Mismo patrón que
     * Mesa en Horeca (pensado para arrastrar-y-soltar en el frontend).
     */
    @PutMapping("/{id}/posicion")
    public ResponseEntity<Potrero> actualizarPosicion(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody PosicionRequest request) {
        Potrero potrero = potreroRepository.findById(id).orElseThrow(() -> new RuntimeException("Potrero no encontrado"));
        if (!potrero.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
        }
        potrero.setPosX(request.posX);
        potrero.setPosY(request.posY);
        if (request.ancho != null) potrero.setAncho(request.ancho);
        if (request.alto != null) potrero.setAlto(request.alto);
        if (request.forma != null) potrero.setForma(request.forma);
        return ResponseEntity.ok(potreroRepository.save(potrero));
    }

    /**
     * Si no se indica capacidadAnimales y/o diasDescansoMinimo, se calculan
     * automáticamente a partir del área y el tipo de pasto (ver
     * ReferenciaPastoreoService) — así el usuario no necesita saber esos
     * números de antemano; puede editarlos después si conoce el valor real
     * de su terreno.
     */
    @PostMapping
    public ResponseEntity<Potrero> crear(@RequestParam Long tenantId, @RequestBody Potrero potrero) {
        potrero.setTenantId(tenantId);
        aplicarRecomendacionSiFalta(tenantId, potrero);
        return ResponseEntity.ok(potreroRepository.save(potrero));
    }

    private void aplicarRecomendacionSiFalta(Long tenantId, Potrero potrero) {
        if (potrero.getCapacidadAnimales() == null || potrero.getDiasDescansoMinimo() == null) {
            ReferenciaPastoreoService.Recomendacion r = referenciaPastoreoService.calcular(tenantId, potrero.getAreaHectareas(), potrero.getTipoPasto());
            if (potrero.getCapacidadAnimales() == null) potrero.setCapacidadAnimales(r.capacidadAnimalesRecomendada);
            if (potrero.getDiasDescansoMinimo() == null) potrero.setDiasDescansoMinimo(r.diasDescansoRecomendado);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Potrero> actualizar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody Potrero datos) {
        Potrero potrero = potreroRepository.findById(id).orElseThrow(() -> new RuntimeException("Potrero no encontrado"));
        potrero.setNombre(datos.getNombre());
        potrero.setAreaHectareas(datos.getAreaHectareas());
        potrero.setCapacidadAnimales(datos.getCapacidadAnimales());
        potrero.setTipoPasto(datos.getTipoPasto());
        potrero.setDiasDescansoMinimo(datos.getDiasDescansoMinimo());
        potrero.setOrdenRotacion(datos.getOrdenRotacion());
        aplicarRecomendacionSiFalta(tenantId, potrero);

        // Al entrar en descanso se marca la fecha de inicio (para contar días); al
        // volver a activo se limpia, para que un descanso futuro cuente desde cero.
        boolean entraEnDescanso = "EN_DESCANSO".equals(datos.getEstado()) && !"EN_DESCANSO".equals(potrero.getEstado());
        boolean vuelveActivo = "ACTIVO".equals(datos.getEstado()) && !"ACTIVO".equals(potrero.getEstado());
        if (entraEnDescanso) {
            potrero.setFechaInicioDescanso(java.time.LocalDate.now());
            potrero.setFechaInicioUso(null);
        }
        if (vuelveActivo) {
            potrero.setFechaInicioDescanso(null);
            potrero.setFechaInicioUso(java.time.LocalDate.now());
        }

        potrero.setEstado(datos.getEstado());
        return ResponseEntity.ok(potreroRepository.save(potrero));
    }

    /** Forma rápida de fijar el orden de rotación de todos los potreros de una vez, sin editar uno por uno. */
    @PostMapping("/reordenar")
    public List<Potrero> reordenar(@RequestParam Long tenantId, @RequestBody List<Long> potreroIdsEnOrden) {
        return potreroRotacionService.reordenar(tenantId, potreroIdsEnOrden);
    }

    public static class RotarRequest {
        public Long potreroDestinoId;
        public List<Long> animalIds; // opcional: si se omite, se mueven TODOS los animales activos del origen
    }

    /** Mueve el hato del potrero {id} al destino indicado: origen queda EN_DESCANSO, destino queda ACTIVO. */
    @PostMapping("/{id}/rotar")
    public Map<String, Object> rotar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody RotarRequest request) {
        return potreroRotacionService.rotar(tenantId, id, request.potreroDestinoId, request.animalIds);
    }

    /** Según el ordenRotacion configurado, cuál potrero sigue después de este en el ciclo. */
    @GetMapping("/{id}/siguiente-rotacion")
    public Potrero siguienteRotacion(@PathVariable Long id, @RequestParam Long tenantId) {
        return potreroRotacionService.obtenerSiguienteEnRotacion(tenantId, id);
    }

    /** Sobrecarga de animales y potreros que ya cumplieron su descanso mínimo y podrían reactivarse. */
    @GetMapping("/alertas")
    public List<Map<String, Object>> alertas(@RequestParam Long tenantId) {
        return potreroRotacionService.obtenerAlertas(tenantId);
    }

    /** Previsualiza la recomendación de capacidad/descanso ANTES de crear el potrero (ej. para mostrarla en el formulario mientras se llena). */
    @GetMapping("/recomendacion")
    public ReferenciaPastoreoService.Recomendacion recomendacionPreliminar(
            @RequestParam Long tenantId, @RequestParam java.math.BigDecimal areaHectareas, @RequestParam(required = false) String tipoPasto) {
        return referenciaPastoreoService.calcular(tenantId, areaHectareas, tipoPasto);
    }

    /** Recomendación para un potrero ya creado, según su área y tipo de pasto actuales. */
    @GetMapping("/{id}/recomendacion")
    public ReferenciaPastoreoService.Recomendacion recomendacion(@PathVariable Long id, @RequestParam Long tenantId) {
        Potrero potrero = potreroRepository.findById(id).orElseThrow(() -> new RuntimeException("Potrero no encontrado"));
        return referenciaPastoreoService.calcular(tenantId, potrero.getAreaHectareas(), potrero.getTipoPasto());
    }

    /** Mapa de potreros: cada potrero con sus animales actuales y % de ocupación — base para la vista visual del frontend. */
    @GetMapping("/mapa")
    public List<Map<String, Object>> mapa() {
        List<Potrero> potreros = potreroRepository.findAll();
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Potrero potrero : potreros) {
            List<Animal> animales = animalRepository.findByPotreroIdAndEstado(potrero.getId(), "ACTIVO");
            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("potrero", potrero);
            entrada.put("animales", animales);
            entrada.put("cantidadAnimales", animales.size());
            if (potrero.getCapacidadAnimales() != null && potrero.getCapacidadAnimales() > 0) {
                entrada.put("porcentajeOcupacion",
                    Math.round((animales.size() * 10000.0) / potrero.getCapacidadAnimales()) / 100.0);
            } else {
                entrada.put("porcentajeOcupacion", null);
            }
            resultado.add(entrada);
        }
        return resultado;
    }
}
