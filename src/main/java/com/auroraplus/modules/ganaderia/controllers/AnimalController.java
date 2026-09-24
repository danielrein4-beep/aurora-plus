package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.reportes.ExcelExportService;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.MovimientoPotrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoPotreroRepository;
import com.auroraplus.modules.ganaderia.services.AnimalQrService;
import com.auroraplus.modules.ganaderia.services.GanaderiaAnimalService;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService;
import com.auroraplus.modules.ganaderia.services.GanaderiaMovimientoService;
import com.auroraplus.modules.ganaderia.services.RentabilidadAnimalService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    @Autowired
    private GanaderiaImportacionService importacionService;

    @Autowired
    private com.auroraplus.modules.ganaderia.services.GanaderiaAnimalService animalService;

    // ── P0: tenant NUNCA viene por query/body/header — siempre de TenantContext/JWT ──

    @GetMapping
    public List<Animal> listar(@RequestParam(required = false) String estado) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return estado != null
                ? animalRepository.findByTenantIdAndEstado(tenantId, estado)
                : animalRepository.findByTenantId(tenantId);
    }

    /** Mismo JSON que siempre; los campos están en {@link GanaderiaAnimalService.DatosAlta}. */
    public static class AltaAnimalRequest extends GanaderiaAnimalService.DatosAlta {}

    /**
     * Alta directa de un animal (Nacimiento en finca, Compra o animal preexistente).
     * Soporta vinculación opcional con la madre y costo de adquisición.
     * Tenant tomado exclusivamente de TenantContext — ningún parámetro externo.
     */
    @PostMapping
    public ResponseEntity<Animal> altaDirecta(@RequestBody AltaAnimalRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        Animal guardado = animalService.alta(tenantId, request);
        auditoriaService.registrar(tenantId, "GANADERIA", "CREAR", "Animal", guardado.getId(),
            "Dio de alta el animal " + guardado.getArete() + (guardado.getPotrero() == null ? " sin potrero asignado" : " en el potrero " + guardado.getPotrero().getNombre()));
        return ResponseEntity.ok(guardado);
    }

    public static class ImportacionRequest {
        public List<GanaderiaImportacionService.FilaImportacion> filas;
    }

    /**
     * Carga inicial del hato desde Excel/CSV (el navegador lee el archivo y envía las filas).
     * confirmar=false solo valida y devuelve la vista previa; confirmar=true guarda todo o nada.
     */
    @PostMapping("/importar")
    public ResponseEntity<GanaderiaImportacionService.ResultadoImportacion> importar(
            @RequestBody ImportacionRequest request,
            @RequestParam(defaultValue = "false") boolean confirmar) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        GanaderiaImportacionService.ResultadoImportacion resultado =
            importacionService.importar(tenantId, request != null ? request.filas : null, confirmar);
        // Vista previa o archivo con errores: no se guardó nada, no hay nada que auditar.
        if (!resultado.confirmado) auditoriaService.omitirRegistroAutomatico();
        return ResponseEntity.ok(resultado);
    }

    /** Hembras preñadas activas con su padrote, para el desglose del hato. */
    @GetMapping("/prenez-actual")
    public List<GanaderiaImportacionService.PrenezActual> prenezActual() {
        return importacionService.prenezActual(GanaderiaTenantAccess.requireTenant());
    }

    @GetMapping("/export-excel")
    public ResponseEntity<byte[]> listarExcel(@RequestParam(required = false) String estado) throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        List<Animal> animales = estado != null
                ? animalRepository.findByTenantIdAndEstado(tenantId, estado)
                : animalRepository.findByTenantId(tenantId);
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
    public RentabilidadAnimalService.RentabilidadAnimal rentabilidad(@PathVariable Long id) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return rentabilidadAnimalService.calcular(tenantId, id);
    }

    /** Rentabilidad de todos los animales ya VENDIDOS. */
    @GetMapping("/rentabilidad-reporte")
    public List<RentabilidadAnimalService.RentabilidadAnimal> rentabilidadReporte() {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return rentabilidadAnimalService.calcularParaVendidos(tenantId);
    }

    @GetMapping("/rentabilidad-reporte/export-excel")
    public ResponseEntity<byte[]> rentabilidadReporteExcel() throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
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
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return animalRepository.findById(id)
            .filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
    }

    @GetMapping("/arete/{arete}")
    public Animal buscarPorArete(@PathVariable String arete) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return animalRepository.findByAreteAndTenantId(arete, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado para el arete: " + arete));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Animal> actualizar(@PathVariable Long id, @RequestBody Animal datos) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        Animal guardado = animalService.actualizar(tenantId, id, datos);
        auditoriaService.registrar(tenantId, "GANADERIA", "EDITAR", "Animal", guardado.getId(), "Actualizó la ficha del animal " + guardado.getArete());
        return ResponseEntity.ok(guardado);
    }

    public static class MoverRequest {
        public Long potreroDestinoId;
        public String motivo;
    }

    @PostMapping("/{id}/mover")
    public ResponseEntity<MovimientoPotrero> mover(@PathVariable Long id, @RequestBody MoverRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        MovimientoPotrero movimiento = ganaderiaMovimientoService.moverAnimal(tenantId, id, request.potreroDestinoId, request.motivo);
        auditoriaService.registrar(tenantId, "GANADERIA", "EDITAR", "MovimientoPotrero", movimiento.getId(),
            "Trasladó " + movimiento.getAnimal().getArete() + " de " + (movimiento.getPotreroOrigen() == null ? "sin potrero" : movimiento.getPotreroOrigen().getNombre()) + " a " + movimiento.getPotreroDestino().getNombre());
        return ResponseEntity.ok(movimiento);
    }

    @GetMapping("/{id}/kardex-ubicacion")
    public List<MovimientoPotrero> kardexUbicacion(@PathVariable Long id) {
        // Valida pertenencia al tenant antes de devolver el kardex
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(id)
            .filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        return movimientoPotreroRepository.findByAnimalIdOrderByFechaRegistroDesc(id);
    }

    /** Ficha con código QR del animal, para identificación rápida en el campo con el celular — estampa el hierro de la finca si está configurado. */
    @GetMapping(value = "/{id}/qr", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> fichaQr(@PathVariable Long id) throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        Animal animal = animalRepository.findById(id)
            .filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        String hierroBase64 = licenciaTenantRepository.findByTenantId(tenantId).map(l -> l.getHierroBase64()).orElse(null);
        byte[] pdf = animalQrService.generarFichaQr(animal, hierroBase64);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"qr-" + animal.getArete() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
