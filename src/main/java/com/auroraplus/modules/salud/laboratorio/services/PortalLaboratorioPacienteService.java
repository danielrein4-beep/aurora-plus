package com.auroraplus.modules.salud.laboratorio.services;

import com.auroraplus.core.config.entities.ConfiguracionTenant;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.ConfiguracionTenantRepository;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.laboratorio.entities.ArchivoExamenRecibido;
import com.auroraplus.modules.salud.laboratorio.entities.ExamenRecibidoPaciente;
import com.auroraplus.modules.salud.laboratorio.repositories.ExamenRecibidoPacienteRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Portal público de recepción de resultados de laboratorio — el paciente
 * escanea el QR fijo del consultorio (impreso en la página 2 de su informe
 * de consulta, ver frontend/src/utils/pdfReports.ts) y sube ahí sus
 * resultados en cuanto el laboratorio se los entrega. Reemplaza el flujo
 * viejo de "orden digital" (OrdenLaboratorio/SaludLaboratorioService) que no
 * se ajustaba a como trabajan las clínicas reales.
 */
@Service
public class PortalLaboratorioPacienteService {

    @Autowired
    private ConfiguracionTenantRepository configuracionTenantRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private ExamenRecibidoPacienteRepository examenRecibidoPacienteRepository;

    @Value("${app.frontend.url:http://localhost:8443}")
    private String frontendUrl;

    private final SecureRandom random = new SecureRandom();

    private String generarTokenAleatorio() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    /** Token fijo del portal — se genera UNA sola vez por tenant y no vuelve a cambiar
     * (si cambiara, todos los QR ya impresos por el doctor dejarían de servir). */
    @Transactional
    public String obtenerOCrearToken(Long tenantId) {
        ConfiguracionTenant config = configuracionTenantRepository.findById(tenantId)
            .orElseGet(() -> {
                ConfiguracionTenant nueva = new ConfiguracionTenant();
                nueva.setTenantId(tenantId);
                return nueva;
            });
        if (config.getTokenPortalLaboratorio() == null || config.getTokenPortalLaboratorio().isBlank()) {
            config.setTokenPortalLaboratorio(generarTokenAleatorio());
            configuracionTenantRepository.save(config);
        }
        return config.getTokenPortalLaboratorio();
    }

    public String obtenerUrlPortal(Long tenantId) {
        return frontendUrl + "/lab-paciente/" + obtenerOCrearToken(tenantId);
    }

    /** PNG del QR que apunta a la URL pública del portal de este tenant — mismo patrón de
     * generación que AnimalQrService (ganadería), reutilizando la misma dependencia ZXing. */
    public byte[] generarQrPortalPng(Long tenantId) throws Exception {
        String url = obtenerUrlPortal(tenantId);
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.MARGIN, 1);
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(url, BarcodeFormat.QR_CODE, 400, 400, hints);
        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    public record InfoPortalPublico(String nombreConsultorio) {}

    /** Datos mínimos para pintar la página pública de carga — nada sensible, solo el
     * nombre del consultorio para que el paciente confirme que es la página correcta. */
    public InfoPortalPublico obtenerInfoPortalPorToken(String token) {
        ConfiguracionTenant config = configuracionTenantRepository.findByTokenPortalLaboratorio(token)
            .orElseThrow(() -> new IllegalArgumentException("Enlace de laboratorio no válido o vencido."));
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(config.getTenantId())
            .orElse(null);
        String nombre = licencia != null ? licencia.getNombreEmpresa() : "su consultorio médico";
        return new InfoPortalPublico(nombre);
    }

    /**
     * Recibe la carga del paciente. Sin sesión de ningún tipo — el token del portal es lo
     * único que identifica el tenant. Intenta vincular por cédula; si no hay match, la
     * carga queda igual guardada pero pacienteId null ("sin identificar" en el inbox).
     */
    @Transactional
    public ExamenRecibidoPaciente recibirCarga(String token, String cedula, String nombre, String telefono, List<MultipartFile> archivos) throws IOException {
        if (cedula == null || cedula.isBlank()) {
            throw new IllegalArgumentException("La cédula es obligatoria para poder identificar a quién pertenecen los resultados.");
        }
        if (archivos == null || archivos.isEmpty()) {
            throw new IllegalArgumentException("Debe adjuntar al menos un archivo (foto o PDF) de sus resultados.");
        }

        ConfiguracionTenant config = configuracionTenantRepository.findByTokenPortalLaboratorio(token)
            .orElseThrow(() -> new IllegalArgumentException("Enlace de laboratorio no válido o vencido."));
        Long tenantId = config.getTenantId();
        String cedulaNormalizada = cedula.trim();

        ExamenRecibidoPaciente examen = new ExamenRecibidoPaciente();
        examen.setTenantId(tenantId);
        examen.setCedulaIngresada(cedulaNormalizada);
        examen.setNombreIngresado(nombre != null ? nombre.trim() : null);
        examen.setTelefonoIngresado(telefono != null ? telefono.trim() : null);

        Optional<Paciente> paciente = pacienteRepository.findByTenantIdAndIdentificacion(tenantId, cedulaNormalizada);
        paciente.ifPresent(p -> examen.setPacienteId(p.getId()));

        int orden = 0;
        for (MultipartFile archivo : archivos) {
            if (archivo.isEmpty()) continue;
            String tipoMime = archivo.getContentType() != null ? archivo.getContentType() : "application/octet-stream";
            String base64 = "data:" + tipoMime + ";base64," + Base64.getEncoder().encodeToString(archivo.getBytes());

            ArchivoExamenRecibido archivoEntidad = new ArchivoExamenRecibido();
            archivoEntidad.setNombreArchivo(archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "archivo");
            archivoEntidad.setTipoMime(tipoMime);
            archivoEntidad.setContenidoBase64(base64);
            archivoEntidad.setOrden(orden++);
            examen.agregarArchivo(archivoEntidad);
        }

        if (examen.getArchivos().isEmpty()) {
            throw new IllegalArgumentException("Los archivos adjuntados están vacíos.");
        }

        return examenRecibidoPacienteRepository.save(examen);
    }

    public List<ExamenRecibidoPaciente> listarInbox(Long tenantId) {
        return examenRecibidoPacienteRepository.findByTenantIdOrderByLeidoAscFechaHoraRecepcionDesc(tenantId);
    }

    public List<ExamenRecibidoPaciente> listarPorPaciente(Long tenantId, Long pacienteId) {
        return examenRecibidoPacienteRepository.findByTenantIdAndPacienteIdOrderByFechaHoraRecepcionDesc(tenantId, pacienteId);
    }

    public long contarNoLeidos(Long tenantId) {
        return examenRecibidoPacienteRepository.countByTenantIdAndLeidoFalse(tenantId);
    }

    /** findById() no respeta el filtro de tenant (mismo hallazgo de seguridad ya corregido
     * hoy en ConsultaMedicaService) — de ahí la verificación explícita acá. */
    private ExamenRecibidoPaciente obtenerPropio(Long tenantId, Long id) {
        ExamenRecibidoPaciente examen = examenRecibidoPacienteRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Examen recibido no encontrado con ID: " + id));
        if (!tenantId.equals(examen.getTenantId())) {
            throw new IllegalArgumentException("Violación de seguridad: el examen no pertenece a este tenant");
        }
        return examen;
    }

    @Transactional
    public ExamenRecibidoPaciente marcarLeido(Long tenantId, Long id, String usuario) {
        ExamenRecibidoPaciente examen = obtenerPropio(tenantId, id);
        if (!examen.isLeido()) {
            examen.setLeido(true);
            examen.setFechaHoraLeido(java.time.LocalDateTime.now());
            examen.setLeidoPor(usuario);
            examenRecibidoPacienteRepository.save(examen);
        }
        return examen;
    }

    @Transactional
    public ExamenRecibidoPaciente vincularPaciente(Long tenantId, Long id, Long pacienteId) {
        ExamenRecibidoPaciente examen = obtenerPropio(tenantId, id);
        Paciente paciente = pacienteRepository.findByTenantIdAndId(tenantId, pacienteId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado en este consultorio"));
        examen.setPacienteId(paciente.getId());
        return examenRecibidoPacienteRepository.save(examen);
    }
}
