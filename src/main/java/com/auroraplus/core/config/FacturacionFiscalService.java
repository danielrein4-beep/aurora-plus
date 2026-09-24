package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Numeración de Factura Fiscal (Formato Libre autorizado por imprenta SENIAT).
 * Apagado por defecto: mientras el dueño no cargue el rango real que le dio
 * SU imprenta autorizada (serie + número desde/hasta) y active el modo
 * FORMATO_LIBRE, esto no hace nada y las ventas siguen imprimiendo Nota de
 * Entrega (no fiscal) como siempre. Nunca se inventa un número de control —
 * eso sería peor que no tener factura: es ilegal.
 */
@Service
public class FacturacionFiscalService {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    /**
     * Reserva y devuelve el siguiente número de control formateado (ej.
     * "00-00001234"), o null si el tenant no tiene Formato Libre activo — en
     * ese caso el llamador debe seguir generando el documento como Nota de
     * Entrega, no una factura. @Transactional para que dos ventas concurrentes
     * nunca reciban el mismo número.
     */
    @Transactional
    public String siguienteNumeroControl(Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        if (!"FORMATO_LIBRE".equals(licencia.getModoFacturacionFiscal())) return null;
        if (licencia.getFacturaSerie() == null || licencia.getFacturaSerie().isBlank()) return null;
        if (licencia.getFacturaNumeroActual() == null) return null;

        long numero = licencia.getFacturaNumeroActual();
        if (licencia.getFacturaNumeroHasta() != null && numero > licencia.getFacturaNumeroHasta()) {
            throw new RuntimeException("Se agotó el rango de números de control fiscal asignado por tu imprenta — solicita un nuevo rango y actualízalo en Facturación Fiscal.");
        }

        licencia.setFacturaNumeroActual(numero + 1);
        licenciaTenantRepository.save(licencia);

        return licencia.getFacturaSerie() + "-" + String.format("%08d", numero);
    }
}
