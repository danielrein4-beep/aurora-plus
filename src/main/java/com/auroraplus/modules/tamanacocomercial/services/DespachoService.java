package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DespachoService {

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    /**
     * Obtiene los catálogos únicos de choferes, placas, minas y el chofer habitual de cada placa.
     */
    public Map<String, Object> obtenerCatalogos() {
        List<String> choferes = despachoComercialRepository.findDistinctChoferes();
        List<String> placas = despachoComercialRepository.findDistinctPlacas();
        List<String> minas = despachoComercialRepository.findDistinctMinas();

        List<DespachoComercial> despachosRecientes = despachoComercialRepository.findAllByOrderByIdDesc();
        Map<String, String> relacionPlacaChofer = new HashMap<>();

        for (DespachoComercial d : despachosRecientes) {
            if (d.getPlaca() != null && !d.getPlaca().trim().isEmpty()
                    && d.getChofer() != null && !d.getChofer().trim().isEmpty()) {
                String placaKey = d.getPlaca().trim().toUpperCase();
                relacionPlacaChofer.putIfAbsent(placaKey, d.getChofer().trim());
            }
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("choferes", choferes);
        respuesta.put("placas", placas);
        respuesta.put("minas", minas);
        respuesta.put("relacionPlacaChofer", relacionPlacaChofer);

        return respuesta;
    }
}
