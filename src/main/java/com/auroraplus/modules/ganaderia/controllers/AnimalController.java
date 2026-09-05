package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.reportes.ExcelExportService;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.MovimientoPotrero;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoPotreroRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import com.auroraplus.modules.ganaderia.services.AnimalQrService;
import com.auroraplus.modules.ganaderia.services.GanaderiaMovimientoService;
import com.auroraplus.modules.ganaderia.services.RentabilidadAnimalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/animales")
public class AnimalController {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private MovimientoPotreroRepository movimientoPotreroRepository;

    @Autowired
    private GanaderiaMovimientoService ganaderiaMovimientoService;

    @Autowired
    private AnimalQrService animalQrService;

    @Autowired
    private RentabilidadAnimalService rentabilidadAnimalService;

    @Autowired
    private ExcelExportService excelExportService;

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @GetMapping
    public List<Animal> listar(@RequestParam(required = false) String estado) {
        return estado != null ? animalRepository.findByEstado(estado) : animalRepository.findAll();
    }

    public static class AltaAnimalRequest {
        public String arete; // identificador único — puede ser el número de arete físico, chip o QR según tipoIdentificador
        public String tipoIdentificador; // ARETE, CHIP o QR (por defecto ARETE)
        public String nombre;
        public String especie; // BOVINO, CAPRINO, OVINO, PORCINO... (por defecto BOVINO)
        public String raza; // libre, se puede repetir entre animales
        public String sexo; // MACHO o HEMBRA
        public String tipoAnimal; // libre: TERNERO, NOVILLA, VACA, TORO... si no se indica, se sugiere automáticamente por edad/sexo
        public LocalDate fechaNacimiento;
        public BigDecimal pesoActual;
        public BigDecimal valorEstimado; // opcional — valor de referencia contable para un animal que YA se tenía (no una compra real)
        public Long potreroId;
    }

    /**
     * Alta directa de un animal que el negocio YA POSEE — a diferencia de
     * "/compras" (que registra una compra real, con proveedor y factura) o
     * de un parto (que requiere todo un evento reproductivo), esta es la
     * forma simple de meter al sistema un animal que el ganadero ya tenía
     * antes de empezar a usarlo (ej. al cargar su hato completo la primera
     * vez). El único dato obligatorio es el identificador único del animal
     * (arete/chip/QN — cada finca reconoce a sus animales distinto, casi
     * siempre por número) — todo lo demás es opcional y se puede completar
     * después.
     */
    @PostMapping
    public ResponseEntity<Animal> altaDirecta(@RequestParam Long tenantId, @RequestBody AltaAnimalRequest request) {
        if (request.arete == null || request.arete.isBlank()) {
            throw new RuntimeException("El identificador del animal (arete/chip/QR) es obligatorio — es como usted lo distingue de los demás");
        }
        if (animalRepository.findByArete(request.arete).isPresent()) {
            throw new RuntimeException("Ya existe un animal registrado con el identificador '" + request.arete + "' — cada animal debe tener uno único");
        }

        Animal animal = new Animal();
        animal.setTenantId(tenantId);
        animal.setArete(request.arete);
        animal.setTipoIdentificador(request.tipoIdentificador != null ? request.tipoIdentificador : "ARETE");
        animal.setNombre(request.nombre);
        animal.setEspecie(request.especie != null ? request.especie : "BOVINO");
        animal.setRaza(request.raza);
        animal.setSexo(request.sexo);
        animal.setTipoAnimal(request.tipoAnimal);
        animal.setFechaNacimiento(request.fechaNacimiento);
        animal.setPesoActual(request.pesoActual);
        animal.setCostoAdquisicion(request.valorEstimado);
        animal.setEstado("ACTIVO");

        if (request.potreroId != null) {
            Potrero potrero = potreroRepository.findById(request.potreroId)
                .orElseThrow(() -> new RuntimeException("Potrero no encontrado: " + request.potreroId));
            if (!potrero.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
            }
            animal.setPotrero(potrero);
        }

        return ResponseEntity.ok(animalRepository.save(animal));
    }

    @GetMapping("/export-excel")
    public ResponseEntity<byte[]> listarExcel(@RequestParam(required = false) String estado) throws Exception {
        List<Animal> animales = estado != null ? animalRepository.findByEstado(estado) : animalRepository.findAll();
        List<List<Object>> filas = new ArrayList<>();
        for (Animal a : animales) {
            filas.add(List.of(
                a.getArete(), a.getNombre() != null ? a.getNombre() : "", a.getEspecie(), a.getSexo(),
                a.getRaza() != null ? a.getRaza() : "", a.getFechaNacimiento() != null ? a.getFechaNacimiento().toString() : "",
                a.getPotrero() != null ? a.getPotrero().getNombre() : "", a.getEstado()
            ));
        }
        byte[] excel = excelExportService.generar("Animales",
            List.of("Arete", "Nombre", "Especie", "Sexo", "Raza", "Fecha Nacimiento", "Potrero", "Estado"), filas);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"animales.xlsx\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excel);
    }

    /** Rentabilidad DIRECTA de un animal (costo de adquisición + sanidad aplicada, contra su venta). */
    @GetMapping("/{id}/rentabilidad")
    public RentabilidadAnimalService.RentabilidadAnimal rentabilidad(@PathVariable Long id, @RequestParam Long tenantId) {
        return rentabilidadAnimalService.calcular(tenantId, id);
    }

    /** Rentabilidad de todos los animales ya VENDIDOS. */
    @GetMapping("/rentabilidad-reporte")
    public List<RentabilidadAnimalService.RentabilidadAnimal> rentabilidadReporte(@RequestParam Long tenantId) {
        return rentabilidadAnimalService.calcularParaVendidos(tenantId);
    }

    @GetMapping("/rentabilidad-reporte/export-excel")
    public ResponseEntity<byte[]> rentabilidadReporteExcel(@RequestParam Long tenantId) throws Exception {
        List<RentabilidadAnimalService.RentabilidadAnimal> reporte = rentabilidadAnimalService.calcularParaVendidos(tenantId);
        List<List<Object>> filas = new ArrayList<>();
        for (RentabilidadAnimalService.RentabilidadAnimal r : reporte) {
            filas.add(List.of(r.animal.getArete(), r.costoAdquisicion, r.costoVacunas, r.costoMedicamentos,
                r.costoTotalDirecto, r.ingresoVenta != null ? r.ingresoVenta : "", r.utilidadDirecta != null ? r.utilidadDirecta : ""));
        }
        byte[] excel = excelExportService.generar("Rentabilidad por Animal",
            List.of("Arete", "Costo Adquisición", "Costo Vacunas", "Costo Medicamentos", "Costo Total", "Ingreso Venta", "Utilidad Directa"), filas);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"rentabilidad-animales.xlsx\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excel);
    }

    @GetMapping("/{id}")
    public Animal obtener(@PathVariable Long id) {
        return animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
    }

    @GetMapping("/arete/{arete}")
    public Animal buscarPorArete(@PathVariable String arete) {
        return animalRepository.findByArete(arete).orElseThrow(() -> new RuntimeException("Animal no encontrado para el arete: " + arete));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Animal> actualizar(@PathVariable Long id, @RequestBody Animal datos) {
        Animal animal = animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        animal.setNombre(datos.getNombre());
        animal.setRaza(datos.getRaza());
        animal.setTipoAnimal(datos.getTipoAnimal());
        animal.setPesoActual(datos.getPesoActual());
        return ResponseEntity.ok(animalRepository.save(animal));
    }

    public static class MoverRequest {
        public Long potreroDestinoId;
        public String motivo;
    }

    @PostMapping("/{id}/mover")
    public ResponseEntity<MovimientoPotrero> mover(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody MoverRequest request) {
        return ResponseEntity.ok(ganaderiaMovimientoService.moverAnimal(tenantId, id, request.potreroDestinoId, request.motivo));
    }

    @GetMapping("/{id}/kardex-ubicacion")
    public List<MovimientoPotrero> kardexUbicacion(@PathVariable Long id) {
        return movimientoPotreroRepository.findByAnimalIdOrderByFechaRegistroDesc(id);
    }

    /** Ficha con código QR del animal, para identificación rápida en el campo con el celular — estampa el hierro de la finca si está configurado. */
    @GetMapping(value = "/{id}/qr", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> fichaQr(@PathVariable Long id, @RequestParam Long tenantId) throws Exception {
        Animal animal = animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        String hierroBase64 = licenciaTenantRepository.findByTenantId(tenantId).map(l -> l.getHierroBase64()).orElse(null);
        byte[] pdf = animalQrService.generarFichaQr(animal, hierroBase64);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"qr-" + animal.getArete() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
