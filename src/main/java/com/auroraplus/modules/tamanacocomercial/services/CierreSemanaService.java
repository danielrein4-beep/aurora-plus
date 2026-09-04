package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.entities.CierreSemana;
import com.auroraplus.modules.tamanacocomercial.repositories.CierreSemanaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;
import java.util.UUID;

@Service
public class CierreSemanaService {

    @Autowired
    private CierreSemanaRepository cierreSemanaRepository;

    @Autowired
    private AuditoriaService auditoriaService;

    private static final String UPLOADS_DIR = "uploads/comprobantes";

    public boolean estaSemanaCerrada(LocalDate fecha) {
        if (fecha == null) return false;
        LocalDate lunes = fecha.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate domingo = lunes.plusDays(6);
        return cierreSemanaRepository.findByFechaInicioSemanaAndFechaFinSemana(lunes, domingo)
                .map(CierreSemana::isPagado)
                .orElse(false);
    }

    public Optional<CierreSemana> getCierreSemana(LocalDate fecha) {
        if (fecha == null) fecha = LocalDate.now();
        LocalDate lunes = fecha.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate domingo = lunes.plusDays(6);
        return cierreSemanaRepository.findByFechaInicioSemanaAndFechaFinSemana(lunes, domingo);
    }

    public CierreSemana registrarPagoSemana(Long tenantId, LocalDate fechaSemana, MultipartFile archivoComprobante, String notas, String usuario) throws IOException {
        if (fechaSemana == null) fechaSemana = LocalDate.now();
        LocalDate lunes = fechaSemana.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate domingo = lunes.plusDays(6);

        CierreSemana cierre = cierreSemanaRepository.findByFechaInicioSemanaAndFechaFinSemana(lunes, domingo)
                .orElseGet(() -> {
                    CierreSemana c = new CierreSemana();
                    c.setTenantId(tenantId);
                    c.setFechaInicioSemana(lunes);
                    c.setFechaFinSemana(domingo);
                    return c;
                });

        String urlArchivo = null;
        if (archivoComprobante != null && !archivoComprobante.isEmpty()) {
            File carpeta = new File(UPLOADS_DIR);
            if (!carpeta.exists()) {
                carpeta.mkdirs();
            }

            String originalName = archivoComprobante.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }

            String nombreGuardado = "comprobante_" + lunes.toString() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path destino = Paths.get(UPLOADS_DIR, nombreGuardado);
            Files.copy(archivoComprobante.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            urlArchivo = "/uploads/comprobantes/" + nombreGuardado;
        }

        cierre.setPagado(true);
        cierre.setFechaPago(LocalDateTime.now());
        if (urlArchivo != null) {
            cierre.setComprobanteUrl(urlArchivo);
        }
        cierre.setCerradoPor(usuario != null ? usuario : "Sistema");
        cierre.setNotas(notas);

        CierreSemana guardado = cierreSemanaRepository.save(cierre);
        auditoriaService.registrar(tenantId, "PAGO_NOMINA", "CIERRE_SEMANA",
            "Cerró y pagó la nómina de la semana " + lunes + " al " + domingo + " por " + cierre.getCerradoPor());

        return guardado;
    }

    public void reabrirSemana(Long tenantId, LocalDate fechaSemana, String usuarioAdmin) {
        if (fechaSemana == null) fechaSemana = LocalDate.now();
        LocalDate lunes = fechaSemana.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate domingo = lunes.plusDays(6);

        cierreSemanaRepository.findByFechaInicioSemanaAndFechaFinSemana(lunes, domingo).ifPresent(cierre -> {
            cierre.setPagado(false);
            cierreSemanaRepository.save(cierre);
            auditoriaService.registrar(tenantId, "REAPERTURA_SEMANA", "CIERRE_SEMANA",
                "Reabrió la nómina de la semana " + lunes + " al " + domingo + " por " + usuarioAdmin);
        });
    }
}
