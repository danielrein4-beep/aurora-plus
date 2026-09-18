package com.auroraplus.core.mensajeria;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.CifradoSimetricoService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * Configuración de WhatsApp Business (Meta) del NEGOCIO — reservado al
 * dueño, mismo criterio que BinancePayConfigController: son credenciales de
 * una cuenta externa del negocio, no un ajuste operativo cualquiera.
 */
@RestController
@RequestMapping("/api/config/mi-negocio/whatsapp")
public class WhatsAppConfigController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CifradoSimetricoService cifradoSimetricoService;

    public static class WhatsAppEstado {
        public boolean configurado;
        public boolean activo;
        public String phoneNumberId; // no es secreto
        public String plantillaNombre;
    }

    private WhatsAppEstado aEstado(LicenciaTenant licencia) {
        WhatsAppEstado estado = new WhatsAppEstado();
        estado.configurado = licencia.getWhatsappPhoneNumberId() != null && licencia.getWhatsappAccessTokenCifrado() != null;
        estado.activo = licencia.isWhatsappActivo();
        estado.phoneNumberId = licencia.getWhatsappPhoneNumberId();
        estado.plantillaNombre = licencia.getWhatsappPlantillaNombre();
        return estado;
    }

    @GetMapping
    public WhatsAppEstado obtenerEstado() {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(TenantContext.getCurrentTenant())
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        return aEstado(licencia);
    }

    public static class GuardarWhatsAppRequest {
        public String phoneNumberId;
        public String accessToken; // en blanco = no cambiar el ya guardado
        public String plantillaNombre;
        public boolean activo;
    }

    @PutMapping
    public WhatsAppEstado guardar(@RequestBody GuardarWhatsAppRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN");
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(TenantContext.getCurrentTenant())
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        if (request.phoneNumberId != null && !request.phoneNumberId.isBlank()) {
            licencia.setWhatsappPhoneNumberId(request.phoneNumberId.trim());
        }
        if (request.accessToken != null && !request.accessToken.isBlank()) {
            licencia.setWhatsappAccessTokenCifrado(cifradoSimetricoService.cifrar(request.accessToken.trim()));
        }
        if (request.plantillaNombre != null && !request.plantillaNombre.isBlank()) {
            licencia.setWhatsappPlantillaNombre(request.plantillaNombre.trim());
        }
        if (request.activo && (licencia.getWhatsappPhoneNumberId() == null || licencia.getWhatsappAccessTokenCifrado() == null
                || licencia.getWhatsappPlantillaNombre() == null)) {
            throw new RuntimeException("Debe configurar Phone Number ID, Access Token y el nombre de la plantilla antes de activar WhatsApp");
        }
        licencia.setWhatsappActivo(request.activo);
        licenciaTenantRepository.save(licencia);

        return aEstado(licencia);
    }
}
