package com.auroraplus.core.config;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.entities.PreferenciaTenant;
import com.auroraplus.core.config.repositories.PreferenciaTenantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Ajustes del negocio que antes vivían solo en el navegador. Cada clave es un JSON y solo se
 * aceptan las claves conocidas, cada una con los roles que pueden cambiarla (leer puede
 * cualquiera del negocio). El negocio sale siempre del token, nunca de la URL.
 */
@RestController
@RequestMapping("/api/preferencias")
public class PreferenciasTenantController {

    private static final int MAX_LARGO = 2_000_000; // el logo del local va en base64 dentro de la configuración
    private static final ObjectMapper JSON = new ObjectMapper();

    private static final Map<String, String[]> CLAVES = Map.of(
        "horeca_config", new String[] {"DUENO_ADMIN"},
        "ganaderia_config", new String[] {"DUENO_ADMIN", "ADMINISTRADOR_FINCA"},
        "salud_agenda_bloqueos", new String[] {"DUENO_ADMIN", "MEDICO", "RECEPCIONISTA"}
    );

    @Autowired
    private PreferenciaTenantRepository repository;

    @GetMapping("/{clave}")
    public ResponseEntity<JsonNode> leer(@PathVariable String clave) throws Exception {
        validarClave(clave);
        PreferenciaTenant p = repository.findByTenantIdAndClave(tenant(), clave).orElse(null);
        if (p == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(JSON.readTree(p.getValor()));
    }

    @PutMapping("/{clave}")
    public ResponseEntity<JsonNode> guardar(@PathVariable String clave, @RequestBody JsonNode valor) {
        validarClave(clave);
        AuthContext.exigirRol(CLAVES.get(clave));
        if (valor == null || valor.isNull()) throw new RuntimeException("No hay nada que guardar");
        String texto = valor.toString();
        if (texto.length() > MAX_LARGO) throw new RuntimeException("La configuración es demasiado grande");

        Long tenantId = tenant();
        PreferenciaTenant p = repository.findByTenantIdAndClave(tenantId, clave).orElseGet(() -> {
            PreferenciaTenant nueva = new PreferenciaTenant();
            nueva.setTenantId(tenantId);
            nueva.setClave(clave);
            return nueva;
        });
        p.setValor(texto);
        p.setActualizadoPor(AuthContext.getUsername());
        p.setFechaActualizacion(LocalDateTime.now());
        repository.save(p);
        return ResponseEntity.ok(valor);
    }

    private static void validarClave(String clave) {
        if (!CLAVES.containsKey(clave)) throw new RuntimeException("Preferencia desconocida: " + clave);
    }

    private static Long tenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio asociado");
        return tenantId;
    }
}
