package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Chofer;
import com.auroraplus.modules.tamanacocomercial.entities.CuotaDespacho;
import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.HistorialProveedor;
import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import com.auroraplus.modules.tamanacocomercial.entities.Proveedor;
import com.auroraplus.modules.tamanacocomercial.repositories.CuotaDespachoRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.HistorialProveedorRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.MinaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.ProveedorRepository;
import com.auroraplus.modules.tamanacocomercial.services.AuditoriaService;
import com.auroraplus.modules.tamanacocomercial.services.ChoferService;
import com.auroraplus.modules.tamanacocomercial.services.CierreSemanaService;
import com.auroraplus.modules.tamanacocomercial.services.DespachoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tamanaco-comercial/despachos")
public class DespachoController {

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private DespachoService despachoService;

    @Autowired
    private AuditoriaService auditoriaService;

    @Autowired
    private MinaRepository minaRepository;

    @Autowired
    private ProveedorRepository proveedorRepository;

    @Autowired
    private HistorialProveedorRepository historialProveedorRepository;

    @Autowired
    private CuotaDespachoRepository cuotaDespachoRepository;

    @Autowired
    private ChoferService choferService;

    @Autowired
    private CierreSemanaService cierreSemanaService;

    private void vincularChoferHistorico(Long tenantId, DespachoComercial despacho) {
        try {
            if (despacho.getCedulaChofer() != null && !despacho.getCedulaChofer().isBlank()) {
                Chofer chofer = choferService.findOrCreateDriver(tenantId, despacho.getCedulaChofer(), despacho.getChofer());
                despacho.setChoferRef(chofer);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @GetMapping("/catalogos")
    public Map<String, Object> obtenerCatalogos() {
        return despachoService.obtenerCatalogos();
    }

    private void autoRegistrarMinaYProveedor(Long tenantId, DespachoComercial despacho) {
        if (despacho == null || despacho.getMina() == null || despacho.getMina().trim().isEmpty()) return;
        String nombre = despacho.getMina().trim();

        if (minaRepository.findByNombreIgnoreCase(nombre).isEmpty()) {
            Mina mina = new Mina();
            mina.setTenantId(tenantId);
            mina.setNombre(nombre);
            mina.setTarifaCopPorTon(BigDecimal.ZERO);
            minaRepository.save(mina);
        }

        Proveedor proveedor;
        Optional<Proveedor> provOpt = proveedorRepository.findByNombreIgnoreCase(nombre);
        if (provOpt.isEmpty()) {
            proveedor = new Proveedor();
            proveedor.setTenantId(tenantId);
            proveedor.setNombre(nombre);
            proveedor.setTipo("Alianza / Brigada");
            proveedor.setActivo(true);
            proveedor.setFechaRegistro(LocalDate.now());
            proveedor = proveedorRepository.save(proveedor);

            HistorialProveedor evento = new HistorialProveedor();
            evento.setTenantId(tenantId);
            evento.setProveedorId(proveedor.getId());
            evento.setTipoEvento("REGISTRO");
            evento.setDescripcion("Proveedor auto-registrado automáticamente tras primer despacho de carga ("
                + (despacho.getPeso() != null ? despacho.getPeso() : BigDecimal.ZERO) + " Ton)");
            historialProveedorRepository.save(evento);
        } else {
            proveedor = provOpt.get();
        }

        HistorialProveedor viaje = new HistorialProveedor();
        viaje.setTenantId(tenantId);
        viaje.setProveedorId(proveedor.getId());
        viaje.setTipoEvento("DESPACHO");
        viaje.setDescripcion(String.format("Carga despachada: %.2f Ton | Chofer: %s | Placa: %s | Fecha: %s",
            despacho.getPeso() != null ? despacho.getPeso() : BigDecimal.ZERO,
            despacho.getChofer() != null ? despacho.getChofer() : "N/A",
            despacho.getPlaca() != null ? despacho.getPlaca() : "N/A",
            despacho.getFechaDespacho() != null ? despacho.getFechaDespacho() : "Hoy"));
        viaje.setMonto(despacho.getPeso());
        viaje.setMoneda("TON");
        historialProveedorRepository.save(viaje);
    }

    private void sincronizarCuota(DespachoComercial despacho, String accion, BigDecimal pesoAnterior) {
        Optional<CuotaDespacho> cuotaOpt = cuotaDespachoRepository.findTopByEstadoOrderByCreatedAtDesc("ACTIVA");
        if (cuotaOpt.isEmpty() || despacho.getPeso() == null) return;

        CuotaDespacho cuota = cuotaOpt.get();
        BigDecimal entregadas = cuota.getToneladasEntregadas() != null ? cuota.getToneladasEntregadas() : BigDecimal.ZERO;

        if ("CREATE".equals(accion)) {
            entregadas = entregadas.add(despacho.getPeso());
        } else if ("UPDATE".equals(accion)) {
            entregadas = entregadas.add(despacho.getPeso().subtract(pesoAnterior != null ? pesoAnterior : BigDecimal.ZERO));
        } else if ("DELETE".equals(accion)) {
            entregadas = entregadas.subtract(despacho.getPeso());
        }

        if (entregadas.compareTo(BigDecimal.ZERO) < 0) entregadas = BigDecimal.ZERO;
        cuota.setToneladasEntregadas(entregadas);
        cuotaDespachoRepository.save(cuota);
    }

    @GetMapping("/cuota-activa")
    public CuotaDespacho getCuotaActiva() {
        return cuotaDespachoRepository.findTopByEstadoOrderByCreatedAtDesc("ACTIVA").orElse(null);
    }

    @GetMapping("/cuotas/historial")
    public List<CuotaDespacho> getHistorialCuotas() {
        return cuotaDespachoRepository.findByEstadoOrderByCreatedAtDesc("COMPLETADA");
    }

    @PostMapping("/cuota")
    public CuotaDespacho crearCuota(@RequestParam Long tenantId, @RequestBody CuotaDespacho cuota) {
        cuotaDespachoRepository.findTopByEstadoOrderByCreatedAtDesc("ACTIVA").ifPresent(c -> {
            c.setEstado("COMPLETADA");
            cuotaDespachoRepository.save(c);
        });
        cuota.setTenantId(tenantId);
        cuota.setEstado("ACTIVA");
        if (cuota.getToneladasEntregadas() == null) cuota.setToneladasEntregadas(BigDecimal.ZERO);
        return cuotaDespachoRepository.save(cuota);
    }

    @GetMapping
    public List<DespachoComercial> listarDespachos() {
        return despachoComercialRepository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public DespachoComercial guardarDespacho(@RequestParam Long tenantId, @RequestBody DespachoComercial despacho) {
        LocalDate fechaOp = despacho.getFechaDespacho() != null ? despacho.getFechaDespacho().toLocalDate() : LocalDate.now();
        if (cierreSemanaService.estaSemanaCerrada(fechaOp)) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.LOCKED, "El período correspondiente a esta fecha ya fue pagado y cerrado. Contacte al Administrador.");
        }

        despacho.setTenantId(tenantId);
        vincularChoferHistorico(tenantId, despacho);
        DespachoComercial guardado = despachoComercialRepository.save(despacho);
        autoRegistrarMinaYProveedor(tenantId, guardado);
        sincronizarCuota(guardado, "CREATE", BigDecimal.ZERO);

        auditoriaService.registrar(tenantId, "CREAR", "DESPACHOS",
            "Registró un despacho con placa " + guardado.getPlaca() + " (" + guardado.getPeso() + " Ton)");

        return guardado;
    }

    @PutMapping("/{id}")
    public DespachoComercial editarDespacho(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody DespachoComercial detalles) {
        DespachoComercial despacho = despachoComercialRepository.findById(id).orElseThrow();

        LocalDate fechaOp = despacho.getFechaDespacho() != null ? despacho.getFechaDespacho().toLocalDate() : LocalDate.now();
        if (cierreSemanaService.estaSemanaCerrada(fechaOp)) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.LOCKED, "El período correspondiente a esta fecha ya fue pagado y cerrado. Contacte al Administrador.");
        }

        BigDecimal pesoViejo = despacho.getPeso() != null ? despacho.getPeso() : BigDecimal.ZERO;

        despacho.setChofer(detalles.getChofer());
        despacho.setPlaca(detalles.getPlaca());
        despacho.setMina(detalles.getMina());
        despacho.setPeso(detalles.getPeso());
        despacho.setFechaDespacho(detalles.getFechaDespacho());
        despacho.setCedulaChofer(detalles.getCedulaChofer());
        vincularChoferHistorico(tenantId, despacho);
        DespachoComercial actualizado = despachoComercialRepository.save(despacho);

        autoRegistrarMinaYProveedor(tenantId, actualizado);
        sincronizarCuota(actualizado, "UPDATE", pesoViejo);

        auditoriaService.registrar(tenantId, "EDITAR", "DESPACHOS",
            "Editó el despacho ID " + id + ". Peso anterior: " + pesoViejo + ", Peso nuevo: " + actualizado.getPeso());

        return actualizado;
    }

    @PostMapping("/{id}/ticket")
    public DespachoComercial subirTicket(@PathVariable Long id, @RequestParam Long tenantId,
                                          @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        DespachoComercial despacho = despachoComercialRepository.findById(id).orElseThrow();

        java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads/tickets");
        if (!java.nio.file.Files.exists(uploadDir)) {
            java.nio.file.Files.createDirectories(uploadDir);
        }

        String filename = id + "_" + System.currentTimeMillis() + "_" + org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());
        java.nio.file.Path filePath = uploadDir.resolve(filename);
        file.transferTo(filePath.toAbsolutePath().toFile());

        despacho.setTicketUrl("/uploads/tickets/" + filename);
        DespachoComercial actualizado = despachoComercialRepository.save(despacho);

        auditoriaService.registrar(tenantId, "EDITAR", "DESPACHOS", "Subió el ticket de romana para el despacho #" + id);
        return actualizado;
    }

    @DeleteMapping("/{id}/ticket")
    public DespachoComercial eliminarTicket(@PathVariable Long id, @RequestParam Long tenantId) {
        DespachoComercial despacho = despachoComercialRepository.findById(id).orElseThrow();
        String ticketUrl = despacho.getTicketUrl();
        if (ticketUrl != null && !ticketUrl.isEmpty()) {
            try {
                String cleanPath = ticketUrl.startsWith("/") ? ticketUrl.substring(1) : ticketUrl;
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(cleanPath));
            } catch (Exception ignored) {}
            despacho.setTicketUrl(null);
            despacho = despachoComercialRepository.save(despacho);
            auditoriaService.registrar(tenantId, "ELIMINAR", "DESPACHOS", "Eliminó el ticket de romana del despacho #" + id);
        }
        return despacho;
    }

    @DeleteMapping("/{id}")
    public void eliminarDespacho(@PathVariable Long id, @RequestParam Long tenantId) {
        Optional<DespachoComercial> d = despachoComercialRepository.findById(id);
        if (d.isPresent()) {
            LocalDate fechaOp = d.get().getFechaDespacho() != null ? d.get().getFechaDespacho().toLocalDate() : LocalDate.now();
            if (cierreSemanaService.estaSemanaCerrada(fechaOp)) {
                throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.LOCKED, "El período correspondiente a esta fecha ya fue pagado y cerrado. Contacte al Administrador.");
            }
            sincronizarCuota(d.get(), "DELETE", BigDecimal.ZERO);
            auditoriaService.registrar(tenantId, "ELIMINAR", "DESPACHOS",
                "Eliminó el despacho ID " + id + " con placa " + d.get().getPlaca() + " (" + d.get().getPeso() + " Ton)");
            despachoComercialRepository.deleteById(id);
        }
    }

    @GetMapping("/ticket/{id}")
    public ResponseEntity<?> obtenerDetalleTicket(@PathVariable Long id) {
        return despachoComercialRepository.findById(id)
                .map(d -> ResponseEntity.ok(Map.of(
                        "id", d.getId(),
                        "fecha", d.getFechaDespacho() != null ? d.getFechaDespacho().toString() : "",
                        "chofer", d.getChofer() != null ? d.getChofer() : "",
                        "placa", d.getPlaca() != null ? d.getPlaca() : "",
                        "mina", d.getMina() != null ? d.getMina() : "",
                        "pesoNeto", d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO,
                        "ticketUrl", d.getTicketUrl() != null ? d.getTicketUrl() : "",
                        "empresa", "CARBONES TAMANACO C.A."
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/foto")
    public ResponseEntity<org.springframework.core.io.Resource> obtenerFotoDespacho(@PathVariable Long id) {
        DespachoComercial despacho = despachoComercialRepository.findById(id).orElse(null);
        if (despacho == null || despacho.getTicketUrl() == null || despacho.getTicketUrl().trim().isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        try {
            String rutaFoto = despacho.getTicketUrl();
            java.nio.file.Path path = java.nio.file.Paths.get(rutaFoto.replaceFirst("^/", ""));
            if (!java.nio.file.Files.exists(path)) {
                path = java.nio.file.Paths.get("uploads", rutaFoto.replaceFirst("^/?uploads/?", ""));
            }
            if (!java.nio.file.Files.exists(path)) {
                return ResponseEntity.notFound().build();
            }

            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());
            String contentType = java.nio.file.Files.probeContentType(path);
            if (contentType == null) contentType = "image/jpeg";

            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
