package com.auroraplus.modules.minero.services;

import com.auroraplus.modules.minero.entities.RegistroBocamina;
import com.auroraplus.modules.minero.repositories.BocaminaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Componente de simulación de carga para la Implementación Piloto (Subfase 3.4).
 * Ejecuta un lote masivo de transacciones simuladas de bocamina, nómina a destajo
 * y zaranda para un tenant piloto (ej. Carbones Tamanaco), validando que la
 * precisión matemática (BigDecimal) y las reglas de negocio se mantengan estables
 * bajo volumen.
 */
@Service
public class SimulacionPilotoService {

    @Autowired
    private BocaminaRepository bocaminaRepository;

    @Autowired
    private NominaService nominaService;

    @Autowired
    private TransformacionService transformacionService;

    public ResultadoSimulacion ejecutarSimulacionCarga(Long tenantId, int cantidadTransacciones) {
        ResultadoSimulacion resultado = new ResultadoSimulacion();

        for (int i = 1; i <= cantidadTransacciones; i++) {
            try {
                // 1. Bocamina: registrar frente de corte
                BigDecimal toneladasEstimadas = BigDecimal.valueOf(ThreadLocalRandom.current().nextDouble(5, 25))
                    .setScale(4, RoundingMode.HALF_UP);

                RegistroBocamina bocamina = new RegistroBocamina();
                bocamina.setTenantId(tenantId);
                bocamina.setFrenteCorte("FRENTE-" + (1 + i % 5));
                bocamina.setTurno(i % 2 == 0 ? "DIA" : "NOCHE");
                bocamina.setCantidadVagonetas(5 + i % 10);
                bocamina.setToneladasEstimadas(toneladasEstimadas);
                bocamina.setFechaRegistro(LocalDateTime.now());
                bocaminaRepository.save(bocamina);
                resultado.totalToneladasBocamina = resultado.totalToneladasBocamina.add(toneladasEstimadas);

                // 2. Nómina a destajo del picador asociado
                BigDecimal tarifaPorTonelada = new BigDecimal("3.50");
                nominaService.calcularYRegistrarDestajo(tenantId, "Picador-" + (1 + i % 8), toneladasEstimadas, tarifaPorTonelada);
                resultado.totalPagadoNomina = resultado.totalPagadoNomina.add(
                    toneladasEstimadas.multiply(tarifaPorTonelada).setScale(2, RoundingMode.HALF_UP));

                // 3. Zaranda: clasificar el lote respetando el balance de masa
                BigDecimal cantidadBruta = toneladasEstimadas;
                BigDecimal cantidadGrano = cantidadBruta.multiply(new BigDecimal("0.50")).setScale(4, RoundingMode.HALF_UP);
                BigDecimal cantidadMenudo = cantidadBruta.multiply(new BigDecimal("0.30")).setScale(4, RoundingMode.HALF_UP);
                BigDecimal cantidadFino = cantidadBruta.multiply(new BigDecimal("0.15")).setScale(4, RoundingMode.HALF_UP);
                BigDecimal porcentajeCeniza = new BigDecimal("8.50");

                transformacionService.registrarTransformacion(
                    tenantId, "LOTE-PILOTO-" + i, cantidadBruta, cantidadGrano, cantidadMenudo, cantidadFino, porcentajeCeniza);

                BigDecimal merma = cantidadBruta.subtract(cantidadGrano).subtract(cantidadMenudo).subtract(cantidadFino);
                resultado.totalMermaZaranda = resultado.totalMermaZaranda.add(merma);

                resultado.transaccionesExitosas++;
            } catch (RuntimeException ex) {
                resultado.transaccionesFallidas++;
            }
        }

        return resultado;
    }

    public static class ResultadoSimulacion {
        private int transaccionesExitosas = 0;
        private int transaccionesFallidas = 0;
        private BigDecimal totalToneladasBocamina = BigDecimal.ZERO;
        private BigDecimal totalPagadoNomina = BigDecimal.ZERO;
        private BigDecimal totalMermaZaranda = BigDecimal.ZERO;

        public int getTransaccionesExitosas() { return transaccionesExitosas; }
        public int getTransaccionesFallidas() { return transaccionesFallidas; }
        public BigDecimal getTotalToneladasBocamina() { return totalToneladasBocamina; }
        public BigDecimal getTotalPagadoNomina() { return totalPagadoNomina; }
        public BigDecimal getTotalMermaZaranda() { return totalMermaZaranda; }
    }
}
