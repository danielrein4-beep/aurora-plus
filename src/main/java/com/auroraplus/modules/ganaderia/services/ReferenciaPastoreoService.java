package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.TabuladorPasto;
import com.auroraplus.modules.ganaderia.repositories.TabuladorPastoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

/**
 * Recomendación de carga animal y descanso a partir del TABULADOR DE PASTOS
 * de cada tenant (ver TabuladorPasto) — una tabla EDITABLE, no un valor fijo
 * en el código: cada negocio parte de valores generales de referencia
 * (sembrados automáticamente la primera vez que hacen falta) pero puede
 * ajustarlos con su propia experiencia real de terreno (lluvia, altura,
 * suelo), sin que nadie tenga que tocar código para eso.
 */
@Service
public class ReferenciaPastoreoService {

    @Autowired
    private TabuladorPastoRepository tabuladorPastoRepository;

    public static class Recomendacion {
        public Integer capacidadAnimalesRecomendada;
        public Integer diasDescansoRecomendado;
        public String tipoPastoUsado; // el nombre de la fila del tabulador que matcheó, o "GENERICO"
        public String nota;
    }

    // Valores de SEMILLA (punto de partida) para cuando un tenant todavía no tiene su tabulador
    // propio — se insertan una sola vez en tabulador_pasto y desde ahí quedan 100% editables por
    // el usuario (ver sembrarValoresPorDefectoSiNecesario). Referencia general de manejo
    // rotacional tropical, NO una medición de ninguna finca real.
    private record SemillaPasto(String nombre, String animalesPorHectarea, int diasDescansoRecomendado) {}

    private static final List<SemillaPasto> SEMILLA = List.of(
        new SemillaPasto("Brachiaria", "2.2", 32),
        new SemillaPasto("Estrella", "2.7", 28),
        new SemillaPasto("Guinea", "2.0", 38),
        new SemillaPasto("Kikuyo", "3.2", 27),
        new SemillaPasto("Angleton", "1.8", 35),
        new SemillaPasto("Pará", "2.0", 35),
        new SemillaPasto("Alemán", "2.3", 30),
        new SemillaPasto("Elefante", "3.5", 30),
        new SemillaPasto("Tanzania", "2.4", 30),
        new SemillaPasto("Mombasa", "2.4", 32)
    );

    private static final String SEMILLA_GENERICA_ANIMALES_HA = "2.0";
    private static final int SEMILLA_GENERICA_DIAS_DESCANSO = 35;

    @Transactional
    public List<TabuladorPasto> sembrarValoresPorDefecto(Long tenantId) {
        if (!tabuladorPastoRepository.findByTenantId(tenantId).isEmpty()) {
            throw new RuntimeException("Este tenant ya tiene su tabulador de pastos — edítelo directamente en vez de volver a sembrarlo");
        }
        for (SemillaPasto s : SEMILLA) {
            TabuladorPasto fila = new TabuladorPasto();
            fila.setTenantId(tenantId);
            fila.setNombre(s.nombre());
            fila.setAnimalesPorHectarea(new BigDecimal(s.animalesPorHectarea()));
            fila.setDiasDescansoRecomendado(s.diasDescansoRecomendado());
            tabuladorPastoRepository.save(fila);
        }
        TabuladorPasto generico = new TabuladorPasto();
        generico.setTenantId(tenantId);
        generico.setNombre("Genérico (no reconocido)");
        generico.setAnimalesPorHectarea(new BigDecimal(SEMILLA_GENERICA_ANIMALES_HA));
        generico.setDiasDescansoRecomendado(SEMILLA_GENERICA_DIAS_DESCANSO);
        generico.setEsGenerico(true);
        tabuladorPastoRepository.save(generico);

        return tabuladorPastoRepository.findByTenantId(tenantId);
    }

    private String normalizar(String s) {
        return s.toUpperCase(Locale.ROOT)
            .replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U");
    }

    /**
     * Calcula la recomendación para un potrero según su área y tipo de pasto,
     * usando el tabulador PROPIO del tenant (se siembra automáticamente con
     * los valores por defecto si todavía no existe, para que nunca falle por
     * falta de configuración previa).
     */
    @Transactional
    public Recomendacion calcular(Long tenantId, BigDecimal areaHectareas, String tipoPasto) {
        Recomendacion r = new Recomendacion();
        if (areaHectareas == null || areaHectareas.compareTo(BigDecimal.ZERO) <= 0) {
            r.nota = "Indique el área en hectáreas del potrero para calcular una recomendación.";
            return r;
        }

        List<TabuladorPasto> tabulador = tabuladorPastoRepository.findByTenantId(tenantId);
        if (tabulador.isEmpty()) {
            tabulador = sembrarValoresPorDefecto(tenantId);
        }

        TabuladorPasto fila = null;
        if (tipoPasto != null && !tipoPasto.isBlank()) {
            String clave = normalizar(tipoPasto);
            fila = tabulador.stream()
                .filter(f -> !f.isEsGenerico())
                .filter(f -> clave.contains(normalizar(f.getNombre())))
                .findFirst().orElse(null);
        }

        boolean generico = fila == null;
        if (generico) {
            fila = tabulador.stream().filter(TabuladorPasto::isEsGenerico).findFirst()
                .orElseThrow(() -> new RuntimeException("El tabulador de este tenant no tiene una fila genérica configurada"));
        }

        r.capacidadAnimalesRecomendada = areaHectareas.multiply(fila.getAnimalesPorHectarea())
            .setScale(0, RoundingMode.DOWN).intValue();
        r.diasDescansoRecomendado = fila.getDiasDescansoRecomendado();
        r.tipoPastoUsado = fila.getNombre();
        r.nota = generico
            ? "Tipo de pasto no reconocido en su tabulador — se usó la fila genérica ("
                + fila.getAnimalesPorHectarea() + " animales/ha, " + fila.getDiasDescansoRecomendado()
                + " días de descanso). Agregue este tipo de pasto a su tabulador (/tabulador-pasto) para una recomendación más precisa."
            : "Según su tabulador de pastos para '" + fila.getNombre() + "' — ajustable en /tabulador-pasto "
                + "con su propia experiencia de terreno.";
        return r;
    }
}
