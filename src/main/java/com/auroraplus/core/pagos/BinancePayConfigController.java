package com.auroraplus.core.pagos;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.CifradoSimetricoService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * Configuración de Binance Pay del NEGOCIO — reservado al dueño porque es
 * literalmente la cuenta bancaria/cripto donde le van a entrar sus ventas.
 */
@RestController
@RequestMapping("/api/config/mi-negocio/binance-pay")
public class BinancePayConfigController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CifradoSimetricoService cifradoSimetricoService;

    public static class BinancePayEstado {
        public boolean configurado;
        public boolean activo;
        public String apiKey; // el API Key no es secreto (viaja en cada request a Binance igual)
    }

    @GetMapping
    public BinancePayEstado obtenerEstado() {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(TenantContext.getCurrentTenant())
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        BinancePayEstado estado = new BinancePayEstado();
        estado.configurado = licencia.getBinancePayApiKey() != null;
        estado.activo = licencia.isBinancePayActivo();
        estado.apiKey = licencia.getBinancePayApiKey();
        return estado;
    }

    public static class GuardarBinancePayRequest {
        public String apiKey;
        public String secretKey; // en blanco = no cambiar el ya guardado
        public boolean activo;
    }

    @PutMapping
    public BinancePayEstado guardar(@RequestBody GuardarBinancePayRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN");
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(TenantContext.getCurrentTenant())
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        if (request.apiKey != null && !request.apiKey.isBlank()) {
            licencia.setBinancePayApiKey(request.apiKey.trim());
        }
        if (request.secretKey != null && !request.secretKey.isBlank()) {
            licencia.setBinancePaySecretKeyCifrado(cifradoSimetricoService.cifrar(request.secretKey.trim()));
        }
        if (request.activo && (licencia.getBinancePayApiKey() == null || licencia.getBinancePaySecretKeyCifrado() == null)) {
            throw new RuntimeException("Debe configurar API Key y Secret Key antes de activar Binance Pay");
        }
        licencia.setBinancePayActivo(request.activo);
        licenciaTenantRepository.save(licencia);

        BinancePayEstado estado = new BinancePayEstado();
        estado.configurado = licencia.getBinancePayApiKey() != null;
        estado.activo = licencia.isBinancePayActivo();
        estado.apiKey = licencia.getBinancePayApiKey();
        return estado;
    }
}
