package com.auroraplus.core.config;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.entities.SaasConfig;
import com.auroraplus.core.config.repositories.SaasConfigRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Cuentas donde los negocios pagan su suscripción a Aurora (Pago Móvil, Binance, Zelle...).
 * El super admin (Propietario o Finanzas) las edita y todos los negocios las leen en
 * Hub > Facturación & Pagos. La lectura del negocio vive bajo /api/suscripcion, que funciona
 * aunque su licencia esté vencida.
 */
@RestController
public class CuentasCobroSaasController {

    private static final String CLAVE = "cuentas_cobro";
    private static final Set<String> CAMPOS = Set.of(
        "banco", "telefono", "cedula", "titular", "tipoCuenta", "binanceUsdt", "zelle", "instrucciones");

    @Autowired private SaasConfigRepository repository;
    @Autowired private ObjectMapper objectMapper;

    /** Lo que ven los negocios. Vacío si todavía no se configuró en el servidor. */
    @GetMapping("/api/suscripcion/cuentas-cobro")
    public Map<String, String> paraNegocio() {
        return leer();
    }

    @GetMapping("/api/super-admin/tenants/finanzas/cuentas-cobro")
    public Map<String, String> paraSuperAdmin() {
        return leer();
    }

    @PutMapping("/api/super-admin/tenants/finanzas/cuentas-cobro")
    public Map<String, String> guardar(@RequestBody Map<String, String> datos) throws Exception {
        Map<String, String> limpio = new LinkedHashMap<>();
        for (String campo : CAMPOS) {
            String v = datos.get(campo);
            limpio.put(campo, v == null ? "" : v.trim());
        }
        SaasConfig c = repository.findById(CLAVE).orElseGet(() -> {
            SaasConfig nueva = new SaasConfig();
            nueva.setClave(CLAVE);
            return nueva;
        });
        c.setValor(objectMapper.writeValueAsString(limpio));
        c.setActualizadoEn(LocalDateTime.now());
        c.setActualizadoPor(AuthContext.getUsername());
        repository.save(c);
        return limpio;
    }

    private Map<String, String> leer() {
        return repository.findById(CLAVE)
            .map(c -> {
                try {
                    return objectMapper.readValue(c.getValor(), new TypeReference<Map<String, String>>() {});
                } catch (Exception e) {
                    return Map.<String, String>of();
                }
            })
            .orElse(Map.of());
    }
}
