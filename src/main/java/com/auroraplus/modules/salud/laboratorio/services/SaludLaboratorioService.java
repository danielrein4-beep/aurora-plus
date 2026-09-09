package com.auroraplus.modules.salud.laboratorio.services;

import com.auroraplus.modules.salud.laboratorio.entities.AdjuntoResultadoLab;
import com.auroraplus.modules.salud.laboratorio.entities.OrdenLaboratorio;
import com.auroraplus.modules.salud.laboratorio.entities.ResultadoLaboratorio;
import com.auroraplus.modules.salud.laboratorio.repositories.OrdenLaboratorioRepository;
import com.auroraplus.modules.salud.laboratorio.repositories.ResultadoLaboratorioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service("saludLaboratorioService")
@Transactional
public class SaludLaboratorioService {

    @Autowired
    private OrdenLaboratorioRepository ordenRepository;

    @Autowired
    private ResultadoLaboratorioRepository resultadoRepository;

    public OrdenLaboratorio crearOrden(Long tenantId, OrdenLaboratorio orden) {
        orden.setTenantId(tenantId);
        orden.setEstado("EMITIDA");
        orden.setFechaEmision(LocalDateTime.now());
        orden.setRevisadoPorMedico(false);

        // Generar token criptográfico único para el QR / enlace
        String token = UUID.randomUUID().toString().replace("-", "");
        orden.setTokenSeguro(token);

        // Generar código de orden con formato amigable ej: LAB-2026-X7B2
        String anio = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy"));
        String sufijo = token.substring(0, 5).toUpperCase();
        orden.setCodigoOrden("LAB-" + anio + "-" + sufijo);

        return ordenRepository.save(orden);
    }

    public List<OrdenLaboratorio> listarPorTenant(Long tenantId) {
        return ordenRepository.findByTenantIdOrderByFechaEmisionDesc(tenantId);
    }

    public List<OrdenLaboratorio> listarPorPaciente(Long tenantId, Long pacienteId) {
        if (tenantId != null) {
            return ordenRepository.findByTenantIdAndPacienteIdOrderByFechaEmisionDesc(tenantId, pacienteId);
        }
        return ordenRepository.findByPacienteIdOrderByFechaEmisionDesc(pacienteId);
    }

    public List<OrdenLaboratorio> listarInbox(Long tenantId) {
        return ordenRepository.listarParaInbox(tenantId);
    }

    public long contarPendientesInbox(Long tenantId) {
        return ordenRepository.contarPendientesRevisionInbox(tenantId);
    }

    public OrdenLaboratorio marcarRevisadoPorMedico(Long tenantId, Long ordenId, String notasRevision) {
        OrdenLaboratorio orden = ordenRepository.findById(ordenId)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + ordenId));

        if (!orden.getTenantId().equals(tenantId)) {
            throw new SecurityException("No tiene permiso sobre esta orden");
        }

        orden.setRevisadoPorMedico(true);
        orden.setFechaRevisionMedico(LocalDateTime.now());
        if (notasRevision != null && !notasRevision.isBlank()) {
            orden.setNotasRevisionMedico(notasRevision);
        }

        return ordenRepository.save(orden);
    }

    @Transactional(readOnly = true)
    public Optional<OrdenLaboratorio> buscarPorToken(String token) {
        return ordenRepository.findByTokenSeguro(token);
    }

    /**
     * Carga el resultado enviado por el bioanalista y sella la orden de forma INMUTABLE
     * en una sola transacción atómica.
     */
    public OrdenLaboratorio cargarResultadoYSealar(
            String token,
            String nombreLaboratorio,
            String bioanalistaResponsable,
            String colegiaturaBioanalista,
            String informeDetallado,
            String conclusionDiagnostica,
            String observacionesMuestra,
            boolean valoresCriticos,
            String detalleValoresCriticos,
            List<AdjuntoPayload> adjuntosPayload,
            String ipCliente
    ) {
        OrdenLaboratorio orden = ordenRepository.findByTokenSeguro(token)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada con el token provisto"));

        if ("SELLADA".equalsIgnoreCase(orden.getEstado())) {
            throw new IllegalStateException("Esta orden médica ya fue procesada y archivada previamente. No se permiten nuevas modificaciones.");
        }

        ResultadoLaboratorio res = new ResultadoLaboratorio();
        res.setNombreLaboratorio(nombreLaboratorio);
        res.setBioanalistaResponsable(bioanalistaResponsable);
        res.setColegiaturaBioanalista(colegiaturaBioanalista);
        res.setInformeDetallado(informeDetallado);
        res.setConclusionDiagnostica(conclusionDiagnostica);
        res.setObservacionesMuestra(observacionesMuestra);
        res.setValoresCriticos(valoresCriticos);
        res.setDetalleValoresCriticos(detalleValoresCriticos);
        res.setIpCarga(ipCliente);
        res.setFechaCarga(LocalDateTime.now());

        if (adjuntosPayload != null) {
            for (AdjuntoPayload ap : adjuntosPayload) {
                if (ap.contenidoBase64 != null && !ap.contenidoBase64.isBlank()) {
                    AdjuntoResultadoLab adj = new AdjuntoResultadoLab();
                    adj.setNombreArchivo(ap.nombreArchivo != null ? ap.nombreArchivo : "adjunto");
                    adj.setTipoMime(ap.tipoMime != null ? ap.tipoMime : "application/octet-stream");
                    adj.setContenidoBase64(ap.contenidoBase64);
                    res.agregarAdjunto(adj);
                }
            }
        }

        orden.setResultado(res);
        orden.setEstado("SELLADA");
        orden.setRevisadoPorMedico(false); // Llega fresca al inbox del doctor

        return ordenRepository.save(orden);
    }

    public static class AdjuntoPayload {
        public String nombreArchivo;
        public String tipoMime;
        public String contenidoBase64;
    }
}
